// Redimensiona e comprime uma imagem no próprio browser, antes de a
// enviar — usado para fotos de perfil, que só aparecem em tamanho pequeno
// no site, mas que as pessoas costumam enviar em tamanho completo (às
// vezes vários MB, direto do telemóvel).
export function compressImageFile(file, maxDimension = 400, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { naturalWidth: width, naturalHeight: height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (webpBlob) => {
          URL.revokeObjectURL(url);
          const gotRealWebp = webpBlob && webpBlob.type === 'image/webp';
          if (gotRealWebp && webpBlob.size < file.size) {
            resolve(new File([webpBlob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' }));
          } else {
            resolve(file); // reserva: usa o ficheiro original se a compressão não ajudar
          }
        },
        'image/webp',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
