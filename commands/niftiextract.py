import nibabel as nib
import numpy as np
import os

# Ruta del archivo NIfTI con múltiples segmentaciones
input_file = rf"C:\Users\DELL\OneDrive\Escritorio\MONAI\0965.nii.gz"

# Directorio de salida
output_dir = rf"C:\Users\DELL\OneDrive\Escritorio\MONAI"
os.makedirs(output_dir, exist_ok=True)

# Cargar el archivo NIfTI
nifti_img = nib.load(input_file)
data = nifti_img.get_fdata()

# Obtener la cantidad de segmentaciones
num_segmentations = int(data.max())

# Dividir las segmentaciones
for i in range(1, num_segmentations + 1):
    # Crear una máscara binaria para la segmentación actual
    segmentation_data = np.where(data == i, 1, 0)

    # Crear una nueva imagen NIfTI
    new_nifti_img = nib.Nifti1Image(segmentation_data, affine=nifti_img.affine, header=nifti_img.header)

    # Guardar la nueva imagen NIfTI
    output_file = os.path.join(output_dir, f'segmentacion_{i}.nii.gz')
    nib.save(new_nifti_img, output_file)

    print(f'Segmentación {i} guardada en {output_file}')