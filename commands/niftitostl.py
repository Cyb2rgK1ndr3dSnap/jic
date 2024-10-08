import vtk
import glob
import SimpleITK as sitk
import numpy as np

if __name__ == '__main__':
    
    # can be done in a loop if you have multiple files to be processed, speed is guaranteed if GPU is used:)
    filename_nii =  rf'C:\Users\DELL\OneDrive\Escritorio\Development\system_3d_integration\segmentations\6257d3d7-e71cbc7f-2d5e9fe0-7500003e-e6ffe12e_lungtumor.nii.gz'
    filename = filename_nii.split(".")[0]

    # read all the labels present in the file
    multi_label_image=sitk.ReadImage(filename_nii)
    img_npy = sitk.GetArrayFromImage(multi_label_image)
    labels = np.unique(img_npy)
    
    # read the file
    reader = vtk.vtkNIFTIImageReader()
    reader.SetFileName(filename_nii)
    reader.Update()
    
    # for all labels presented in the segmented file
    for label in labels:

        if int(label) != 0:

            # apply marching cube surface generation
            surf = vtk.vtkDiscreteMarchingCubes()
            surf.SetInputConnection(reader.GetOutputPort())
            surf.SetValue(0, int(label)) # use surf.GenerateValues function if more than one contour is available in the file
            surf.Update()
            
            #smoothing the mesh
            smoother= vtk.vtkWindowedSincPolyDataFilter()
            if vtk.VTK_MAJOR_VERSION <= 5:
                smoother.SetInput(surf.GetOutput())
            else:
                smoother.SetInputConnection(surf.GetOutputPort())
            
            # increase this integer set number of iterations if smoother surface wanted
            smoother.SetNumberOfIterations(50) 
            smoother.NonManifoldSmoothingOn()
            smoother.NormalizeCoordinatesOn() #The positions can be translated and scaled such that they fit within a range of [-1, 1] prior to the smoothing computation
            smoother.GenerateErrorScalarsOn()
            smoother.Update()
            
            # save the output
            writer = vtk.vtkSTLWriter()
            writer.SetInputConnection(smoother.GetOutputPort())
            writer.SetFileTypeToASCII()
            
            # file name need to be changed
            # save as the .stl file, can be changed to other surface mesh file
            writer.SetFileName(r"C:\tmp\test.stl")
            writer.Write()