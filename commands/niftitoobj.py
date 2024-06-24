import nibabel as nib
import numpy as np
from skimage import measure
from scipy.spatial.transform import Rotation as R
import trimesh
import os

# Función para suavizar la malla utilizando Laplacian smoothing
def taubin_smoothing(mesh, iterations=5, lambda_factor=0.5):
    for _ in range(iterations):
        trimesh.smoothing.filter_laplacian(mesh, lamb=lambda_factor)
    return mesh

# Ruta del archivo NIfTI con múltiples segmentaciones
input_file = rf"C:\Users\DELL\OneDrive\Escritorio\MONAI\segmentacion_1.nii.gz"

# Directorio de salida
output_dir = rf"C:\Users\DELL\OneDrive\Escritorio\MONAI"
#os.makedirs(output_dir, exist_ok=True)

# Cargar el archivo NIfTI
nifti_img = nib.load(input_file)
data = nifti_img.get_fdata()

# Obtener la cantidad de segmentaciones
num_segmentations = int(data.max())

# Ángulo de rotación en grados (rotación de 180 grados alrededor del eje IS)
angle_degrees = 180
rotation = R.from_euler('z', angle_degrees, degrees=True)

# Traslación en X e Y (ajusta estos valores según tus necesidades)
translation_x = -1.0
translation_y = -1.0
translation_z = -14.0

# Dividir las segmentaciones y convertirlas a archivos OBJ
for i in range(1, num_segmentations + 1):
    # Crear una máscara binaria para la segmentación actual
    segmentation_data = np.where(data == i, 1, 0)

    # Generar la malla a partir de la segmentación
    verts, faces, _, _ = measure.marching_cubes(segmentation_data, level=0)
    
    # Convertir los vértices a coordenadas del mundo real
    verts = nib.affines.apply_affine(nifti_img.affine, verts)

    # Aplicar la rotación de 180 grados alrededor del eje IS (eje Z)
    verts = rotation.apply(verts)

    # Crear la malla
    mesh = trimesh.Trimesh(vertices=verts, faces=faces)

    # Suavizar la malla
    mesh = taubin_smoothing(mesh, iterations=2, lambda_factor=0.5)

    # Aplicar traslación en X e Y e Z
    mesh.vertices[:, 0] += translation_x  # Traslación en X
    mesh.vertices[:, 1] += translation_y  # Traslación en Y
    mesh.vertices[:, 2] += translation_z  # Traslación en Z
    
    # Guardar la malla como archivo OBJ
    output_file = os.path.join(output_dir, f'segmentacion_{i}.obj')
    mesh.export(output_file)

    print(f'Segmentación {i} guardada en {output_file}')