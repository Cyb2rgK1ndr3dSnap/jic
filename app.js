const express = require('express')
const app = express()
const path = require('path');
//const { exec } = require("child_process");
const childProcess = require("child_process")
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bodyParser = require("body-parser");
const models = require("./models/models.json")

var monaiServer;

BigInt.prototype.toJSON = function(){
  return this.toString()
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Rutas relativas de los archivos guardados
app.get('/series/:fileName', (req, res) => {
  const fileName = req.params.fileName; // Get the filename from the URL parameter
  const filePath = path.join(__dirname, 'series', fileName); // Construct absolute path
  res.sendFile(filePath); // Send the file
});

app.get('/segmentations/:fileName', (req, res) => {
  const fileName = req.params.fileName; // Get the filename from the URL parameter
  const filePath = path.join(__dirname, 'segmentations', fileName); // Construct absolute path
  res.sendFile(filePath); // Send the file
});

app.get('/js/:fileName', (req, res) => {
  const fileName = req.params.fileName; // Get the filename from the URL parameter
  const filePath = path.join(__dirname, 'views/js', fileName); // Construct absolute path
  res.sendFile(filePath); // Send the file
});

app.get('/css/:fileName', (req, res) => {
  const fileName = req.params.fileName; // Get the filename from the URL parameter
  const filePath = path.join(__dirname, 'views/css', fileName); // Construct absolute path
  res.sendFile(filePath); // Send the file
});

app.post('/series', async (req, res)=>{
  const {parentId} = req.body
  const series = await prisma.resources.findMany({
    where:{
      parentid:{
        equals: parentId
      }
    }
  })
  update = JSON.stringify(series);
  res.status(200).json(update)
});

app.post('/studies', async (req, res)=>{
  const {parentId} = req.body
  const studies = await prisma.$queryRaw`select * from resources as r, dicomidentifiers as d where d.id = r.internalid and parentid=${BigInt(parentId)} and taggroup=8 and tagelement=32;`
  /*
  const studies = await prisma.resources.findMany({
    where:{
      parentid:{
        equals: parentId
      }
    }
  })*/
  update = JSON.stringify(studies);
  res.status(200).json(update)
});

app.get('/patients', async (req, res)=>{
  const patients = await prisma.$queryRaw`
  select r.internalid,r.publicid,r.resourcetype,r.parentid,d.value paciente 
  from dicomidentifiers AS d,resources AS r 
  where d.id = r.internalid and parentid is NULL and tagelement=16;`
  /*
  const patients = await prisma.resources.findMany({
    where:{
      parentid :{
        equals: null
      }
    }
  })*/
  update = JSON.stringify(patients);
  res.status(200).json(update)
});

app.get('/index', function(req, res) {
  //res.sendFile(path.join(__dirname, '/views/index.html'));
  res.render('index', { host: process.env.HOST_SERVER })
});

//Comprobar que no exista ya el archivo, se descarga el archivo en formato nifti del servidor Orthanc
app.get('/serie/:id', function(req,res) {
  const id = req.params.id;
  childProcess.exec(`curl -XGET ${process.env.ORTHANC_SERVER}/series/${id}/nifti?compress -o C:/Users/DELL/OneDrive/Escritorio/Development/system_3d_integration/series/${id}.nii.gz`)
  //res.sendFile(path.join(__dirname,'/views/serie.html'));
  res.render('serie')
});
//SLICER_PATH archivo raíz dónde está instalado 3DSlicer, SCRIPT_PATH archivo donde se tiene el script que correra adentro de la app de 3DSlicer
app.post('/inference', async function(req,res){
  const {id,topography} = req.body
  console.log(id)
  console.log(topography)
  childProcess.exec(`"${process.env.SLICER_PATH}" --no-splash --python-script "${process.env.SCRIPT_PATH}" ${id} ${topography}`)
  //################CREAR BUCLE hasta 
  /*while(num < 10){
    print("bucle")
    time.sleep(1)
    num=num+1
  }*/
  const exist = await prisma.process.findUnique({
    where:{
      AND:{
        id:{
          equals:id
        },
        model:{
          equals:topography
        }
      }
    }
  })
  
  if(exist){
    var datetime = new Date();
    const updateInference = await prisma.$queryRaw`UPDATE process SET segmentation=true,stl=false,creacion=${datetime} WHERE id=${id} and model=${topography},`
    if(updateInference) return res.status(200).json({
      isSuccess:true,
      message:"Actualización de inferencia realizada"
    })
  }else{
    var datetime = new Date();
    const createInference = await prisma.$queryRaw`INSERT INTO process(id,model,segmentation,stl,creacion) VALUES (${id},${topography},true,false,${datetime})`
    if(createInference) return res.status(200).json({
      isSuccess:true,
      message:"Inferencia realizada"
    })
  }
  
  return res.status(500).json({
    isSuccess:false,
    message:"Ocurrio un error al realizar la inferencia"
  })
})

app.post('/inferences/:id', async (req, res)=>{
  const id = req.params.id;
  const inferences = await prisma.process.findMany({
    where:{
      id:{
        equals:id
      }
    }
  })
  if(inferences) return res.status(200).json(inferences)
  
  return res.status(204)
})

//MONAI_PATH carpeta dónde se encuentras la carpeta de monai y adentro los módulos para poder cargarlos 
app.get('/monai', function(req,res){
  //`monailabel start_server --app radiology --studies Desktop --conf models segmentation_spleen --conf skip_trainers true`
  var commandServer = `monailabel start_server --app radiology --studies Desktop --conf models "`
  if(monaiServer){
    childProcess.exec(`taskkill /pid ${monaiServer.pid} /f /t > nul 2>&1`)
  }
  models.forEach(models =>{
    commandServer += `${models.model}`
  })
  commandServer += `" --conf skip_trainers true`
  console.log(commandServer)
  monaiServer = childProcess.exec(commandServer,
  { cwd: process.env.MONAI_PATH }, 
  (error, stdout, stderr) =>
    {
      if (error) {
        console.error(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
      }
      //console.log(`stdout:\n${stdout.toString()}`);
    })
    console.log(monaiServer.pid)
    /*setTimeout(() => {
      childProcess.exec(`taskkill /pid ${monaiServer.pid} /f /t > nul 2>&1`)
    }, 10000);*/
    
  res.status(200).json({good:"good"})
})

/*app.get('/test',function(req, res) {
  var child = exec("curl -XGET http://localhost:8042/series/feae4fde-3367e594-1141d289-b76cb74a-c70587cd/nifti?compress -o C:/Users/DELL/OneDrive/Escritorio/Development/test.nii.gz");
})*/

/*app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, '/views/index_2.html'));
});*/
app.listen(4000)