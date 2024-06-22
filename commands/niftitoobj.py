import nibabel as nib
import numpy as np
from skimage import measure
import trimesh

def nifti_to_mesh(input_filepath, output_filepath):
    # Carga el archivo NIFTI
    img = nib.load(input_filepath)
    data = img.get_fdata()

    # Genera un valor de umbral para el isosuperficie
    # Aquí usamos un umbral de 0 para una imagen binaria, ajústalo según tus datos
    #threshold = np.max(data) / 2

    # Genera una malla de isosuperficie usando el algoritmo Marching Cubes
    verts, faces, normals, values = measure.marching_cubes(data, level=threshold)

    # Crea una malla Trimesh
    mesh = trimesh.Trimesh(vertices=verts, faces=faces, vertex_normals=normals)

    # Guarda la malla en un archivo OBJ
    mesh.export(output_filepath)
    print(f"Malla guardada en: {output_filepath}")

# Especifica la ruta del archivo de entrada y de salida
input_filepath = rf'C:\Users\DELL\OneDrive\Escritorio\Development\system_3d_integration\segmentations\6257d3d7-e71cbc7f-2d5e9fe0-7500003e-e6ffe12e_lungtumor.nii.gz'
output_filepath = r"C:\tmp\test.obj"

# Convierte y guarda la malla
nifti_to_mesh(input_filepath, output_filepath)