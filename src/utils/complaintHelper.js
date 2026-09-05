export const buildComplaintFormData = async (categories, newFilesMap) => {
  const formData = new FormData();
  
  // newFilesMap: { [`photoBefore_${globalIndex}_${i}`]: File, ... }
  
  // Format categories for backend
  const formattedCategories = categories.map((cat, catIndex) => {
    return {
      name: cat.name,
      items: (cat.items || []).map((item, itemIndex) => {
        // Extract existing photo URLs
        const existingBefore = item.existingPhotoBeforeUrls !== undefined 
          ? item.existingPhotoBeforeUrls 
          : (item.photos || []).filter(p => p.type === "BEFORE").map(p => p.url);
          
        const existingAfter = item.existingPhotoAfterUrls !== undefined 
          ? item.existingPhotoAfterUrls 
          : (item.photos || []).filter(p => p.type === "AFTER").map(p => p.url);

        return {
          id: item.id || undefined,
          defectList: item.defectList,
          status: item.status || false,
          repairDate: item.repairDate || null,
          repairDefectReport: item.repairDefectReport || null,
          existingPhotoBeforeUrls: existingBefore,
          existingPhotoAfterUrls: existingAfter
        };
      })
    };
  });

  formData.append("complaintData", JSON.stringify({ categories: formattedCategories }));

  // Append new files (with compression)
  if (newFilesMap) {
    const { compressImage } = await import('./imageCompression.js');
    for (const key of Object.keys(newFilesMap)) {
      try {
        const compressed = await compressImage(newFilesMap[key]);
        formData.append(key, compressed);
      } catch (err) {
        console.error('Error compress:', err);
        formData.append(key, newFilesMap[key]);
      }
    }
  }

  return formData;
};

export const flattenComplaintItems = (categories) => {
  const flat = [];
  (categories || []).forEach((category, categoryIndex) => {
    (category.items || []).forEach((item, itemIndexInCategory) => {
      flat.push({ category, categoryIndex, item, itemIndexInCategory });
    });
  });
  return flat.map((entry, globalIndex) => ({ ...entry, globalIndex }));
};
