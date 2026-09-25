export const compressImage = (file, options = {}) => {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.7,
    mimeType = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve(file); // Bukan gambar, kembalikan apa adanya
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Kalkulasi aspek rasio untuk resize
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas ke Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Gagal mengkompresi gambar.'));
              return;
            }
            // Buat file baru dari Blob dengan nama asli (ekstensi diganti ke jpg)
            let newFileName = file.name;
            if (mimeType === 'image/jpeg' && !newFileName.toLowerCase().endsWith('.jpg') && !newFileName.toLowerCase().endsWith('.jpeg')) {
                newFileName = newFileName.replace(/\.[^/.]+$/, "") + ".jpg";
            }
            const newFile = new File([blob], newFileName, {
              type: mimeType,
              lastModified: Date.now(),
            });
            resolve(newFile);
          },
          mimeType,
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const compressFiles = async (files, options = {}) => {
  const compressedFiles = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const compressed = await compressImage(file, options);
      compressedFiles.push(compressed);
    } catch (error) {
      console.error('Error compressing file:', file.name, error);
      compressedFiles.push(file); // Fallback ke file asli jika gagal
    }
  }
  return compressedFiles;
};
