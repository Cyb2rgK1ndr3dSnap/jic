import slicer
import sys

slicer.util.mainWindow().showMinimized()
nodeSegmentation = None
node = slicer.util.loadVolume(rf"C:\Users\DELL\OneDrive\Escritorio\Development\system_3d_integration\series\{sys.argv[1]}.nii.gz")
slicer.util.selectModule('MONAILabel')
slicer.modules.MONAILabelWidget.fetchInfo()
slicer.modules.MONAILabelWidget.ui.segmentationModelSelector.setCurrentText(sys.argv[2])
slicer.modules.MONAILabelWidget.onClickSegmentation()


all_nodes = slicer.mrmlScene.GetNodesByClass("vtkMRMLSegmentationNode")
for node in all_nodes:
    nodeSegmentation = slicer.util.getFirstNodeByName(node.GetName())

output_mask = slicer.mrmlScene.AddNewNodeByClass("vtkMRMLLabelMapVolumeNode")
segmentation_as_labelmap = slicer.mrmlScene.AddNewNodeByClass("vtkMRMLLabelMapVolumeNode")
slicer.modules.segmentations.logic().ExportVisibleSegmentsToLabelmapNode(nodeSegmentation, segmentation_as_labelmap, output_mask)
slicer.util.saveNode(segmentation_as_labelmap, rf"C:\Users\DELL\OneDrive\Escritorio\Development\system_3d_integration\segmentations\{sys.argv[1]}_{sys.argv[2]}.nii.gz")

exit()

slicer.util.selectModule('MONAILabel')
slicer.modules.MONAILabelWidget.onStopTraining()
slicer.modules.MONAILabelWidget.fetchInfo()
slicer.modules.MONAILabelWidget.ui.segmentationModelSelector.setCurrentText("lungairway")
slicer.modules.MONAILabelWidget.onTraining()