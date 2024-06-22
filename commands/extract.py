import json
import SimpleITK as sitk

image_path = rf"C:\Users\DELL\OneDrive\Escritorio\MONAI\Results\KidneyTumor\Results_1\case_00292.nii.gz"  # change this with your file

 # read image
itk_image = sitk.ReadImage(image_path) 

print(itk_image)
# get metadata dict
header = {k: itk_image.GetMetaData(k) for k in itk_image.GetMetaDataKeys()}

# save dict in 'header.json'
with open("header.json", "w") as outfile:
    json.dump(header, outfile, indent=4)