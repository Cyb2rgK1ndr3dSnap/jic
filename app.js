const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const childProcess = require("child_process");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bodyParser = require("body-parser");
const models = require("./models/models.json");

var mServer = [];

BigInt.prototype.toJSON = function() {
  return this.toString();
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta 'Images'
app.use('/Images', express.static(path.join(__dirname, 'Images')));

// Rutas relativas de los archivos guardados
app.get('/series/:fileName', (req, res) => {
  const fileName = req.params.fileName; // Obtener el nombre del archivo del parámetro de la URL
  const filePath = path.join(__dirname, 'series', fileName);
  res.sendFile(filePath); // Enviar el archivo
});

app.get('/segmentations/:fileName', (req, res) => {
  const fileName = req.params.fileName; // Obtener el nombre del archivo del parámetro de la URL
  const filePath = path.join(__dirname, 'segmentations', fileName); // Construir la ruta absoluta
  res.sendFile(filePath); // Enviar el archivo
});

app.get('/js/:fileName', (req, res) => {
  const fileName = req.params.fileName; // Obtener el nombre del archivo del parámetro de la URL
  const filePath = path.join(__dirname, 'views/js', fileName); // Construir la ruta absoluta
  res.sendFile(filePath); // Enviar el archivo
});

app.get('/css/:fileName', (req, res) => {
  const fileName = req.params.fileName; // Obtener el nombre del archivo del parámetro de la URL
  const filePath = path.join(__dirname, 'views/css', fileName); // Construir la ruta absoluta
  res.sendFile(filePath); // Enviar el archivo
});

app.post('/series', async (req, res) => {
  const { parentId } = req.body;
  const series = await prisma.resources.findMany({
    where: {
      parentid: {
        equals: parentId
      }
    }
  });
  update = JSON.stringify(series);
  res.status(200).json(update);
});

app.post('/studies', async (req, res) => {
  const { parentId } = req.body;
  const studies = await prisma.$queryRaw`select * from resources as r, dicomidentifiers as d where d.id = r.internalid and parentid=${BigInt(parentId)} and taggroup=8 and tagelement=32;`
  update = JSON.stringify(studies);
  res.status(200).json(update);
});

app.get('/patients', async (req, res) => {
  const patients = await prisma.$queryRaw`
    select r.internalid,r.publicid,r.resourcetype,r.parentid,d.value paciente 
    from dicomidentifiers AS d,resources AS r 
    where d.id = r.internalid and parentid is NULL and tagelement=16;`
  update = JSON.stringify(patients);
  res.status(200).json(update);
});

app.get('/index', function(req, res) {
  res.render('index', { host: process.env.HOST_SERVER });
});

// Comprobar que no exista ya el archivo, se descarga el archivo en formato nifti del servidor Orthanc
app.get('/serie/:id', function(req, res) {
  const id = req.params.id;
  childProcess.exec(`curl -XGET ${process.env.ORTHANC_SERVER}/series/${id}/nifti?compress -o ${process.env.SERIES_PATH}/${id}.nii.gz`);
  res.render('serie', {id:id,models:models});
});

// SLICER_PATH archivo raíz dónde está instalado 3DSlicer, SCRIPT_PATH archivo donde se tiene el script que correra adentro de la app de 3DSlicer
app.post('/inference', async function(req, res) {
  const { id, topography } = req.body;
  const exist = await prisma.process.findMany({
    where: {
      AND: {
        id: {
          equals: id
        },
        model: {
          equals: topography
        }
      }
    }
  });
  //const fileName = `${id}_${topography}`
  const filePath = `${process.env.SEGMENTATIONS_PATH}/${id}_${topography}.nii.gz`;
  console.log(filePath)
  console.log(exist)
  if (exist != null) {
    console.log("ENTRO A UPDATE")
    var datetime = new Date();
    const updateInference = await prisma.$queryRaw`UPDATE process SET segmentation = true, stl=false, creacion=${datetime} WHERE id=${id} and model=${topography}`;
    if (updateInference) return res.status(200).json({
      message: "La inferencia ya ha sido realizada"
    });
  }else {
    childProcess.exec(`"${process.env.SLICER_PATH}" --no-splash --python-script "${process.env.SCRIPT_PATH}" ${id} ${topography}`);
    waitForFile(filePath).then(async () => {
      console.log(`El archivo ${filePath} ha sido creado.`);
      var datetime = new Date();
      //const createInference = await prisma.$queryRaw`INSERT INTO process (id,model,segmentation,stl,creacion) VALUES (${id},${topography},true,false,${datetime})`;
      const createInference = await prisma.process.create({
        data:{
          id: id,
          model: topography,
          segmentation: true,
          stl: false,
          creacion: datetime
        }
      })
      if (createInference) return res.status(200).json({
        isSuccess: true,
        message: "Inferencia realizada"
      });
      console.log("ENTRO A CREAR")
      return res.status(500).json({
        isSuccess: false,
        message: "Ocurrió un error al realizar la inferencia"
      });
    }).catch((err) => {
      console.error('Error:', err);
    });
  }
});

app.post('/inferenceV2', async function(req, res) {
  const { id, topography } = req.body;
  const exist = await prisma.process.findMany({
    where: {
      AND: {
        id: {
          equals: id
        },
        model: {
          equals: topography
        }
      }
    }
  }) ;
  //const fileName = `${id}_${topography}`
  const filePath = `${process.env.SEGMENTATIONS_PATH}/${id}_${topography}.nii.gz`;
  console.log(filePath)
  console.log(exist)
  if(exist.length != 0) {
    console.log("ENTRO A UPDATE")
    var datetime = new Date();
    const updateInference = await prisma.$queryRaw`UPDATE process SET segmentation = true, stl=false, creacion=${datetime} WHERE id=${id} and model=${topography}`;
    if (updateInference) return res.status(200).json({message: "La inferencia ya ha sido realizada"});
  }else {
    try{
      const image = encodeURIComponent(`${process.env.SERIES_PATH}/${id}.nii.gz`);
      const sessionId = encodeURIComponent(`${process.env.SEGMENTATIONS_PATH}/${id}_${topography}.nii.gz`);
      const path = encodeURIComponent(`${process.env.SEGMENTATIONS_PATH}/${id}_${topography}.nii.gz`);
      const url = `http://localhost:8000/infer/${topography}?image=${image}&session_id=${sessionId}&path=${path}&output=json`;
      const response = await fetch(url,{
            method: 'POST',
            headers: {
                'accept': 'application/json',
            }
      })
      console.log(response)
      waitForFile(filePath).then(async () => {
        console.log(`El archivo ${filePath} ha sido creado.`);
        var datetime = new Date();
        const createInference = await prisma.process.create({
          data:{
            id: id,
            model: topography,
            segmentation: true,
            stl: false,
            creacion: datetime
          }
        })
        if (createInference) return res.status(200).json({
          isSuccess: true,
          time: response,
          message: "Inferencia realizada"
        });
        return res.status(500).json({
          isSuccess: false,
          message: "Ocurrió un error al realizar la inferencia"
        });
      }).catch((err) => {
        return res.status(500).json({isSuccess: false, message: "Ocurrió un error al realizar la inferencia"});
      });
    }catch(error){
      return res.status(500).json({isSuccess: false, message: "Ocurrió un error al realizar la inferencia"});
    }
  }
});

app.post('/inferences/:id', async (req, res) => {
  const id = req.params.id;
  const inferences = await prisma.process.findMany({
    where: {
      id: {
        equals: id
      }
    }
  });
  if (inferences) 
    return res.status(200).json(inferences);
  
  return res.status(204);
});

// MONAI_PATH carpeta dónde se encuentras la carpeta de monai y adentro los módulos para poder cargarlos 
app.get('/server/:action', function(req, res) {
  const action = req.params.action
  var commandServer = `monailabel start_server --app radiology --studies Desktop --conf models "`;
  if (mServer.length == 3) {
    return res.status(200).json({ message: "Servers limit", servers: mServer})
  }
  if (action == "close")
    
  if (action == "up")
    models.forEach(model => {
      commandServer += `${model.model},`;
    });
    commandServer += `segmentation_spleen`
    commandServer += `" --conf skip_trainers true`;
    childP = childProcess.exec(commandServer, { cwd: process.env.MONAI_PATH }, (error, stdout, stderr) => {
      if (error) {
        console.error(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
      }
    });
    mServer.push({childP : childP.pid})
    return res.status(200).json({ message: "Server up", servers: mServer});
});
//---------------------------------------------------------------------------------------------
/*function verificarArchivo(fileName) {
  const rutaCompleta = process.env.SEGMENTATIONS_PATH+"/"+fileName+".nii.gz";
  console.log(rutaCompleta)
  return fs.existsSync(rutaCompleta);
}

async function esperarArchivo(fileName) {
  console.log(`...`);

  if (verificarArchivo(fileName) != null) {
      setTimeout(esperarArchivo, 60000);
      return
  } else {
      console.log(`¡!`);
  }
}*/
async function waitForFile(filePath,res) {
  return new Promise((resolve, reject) => {
      const dir = path.dirname(filePath);
      const fileName = path.basename(filePath);

      const watcher = fs.watch(dir, (eventType, filename) => {
          if (eventType === 'rename' && filename === fileName) {
              watcher.close();
              resolve(filePath);
          }
      });
      // Verificar si el archivo ya existe para evitar esperar innecesariamente
      if (fs.existsSync(filePath)) {
          watcher.close();
          resolve(filePath);
      }
  });
}

//const filePath = path.join(__dirname, 'nombre_del_archivo.txt');
//---------------------------------------------------------------------------------------------
app.listen(4000);
