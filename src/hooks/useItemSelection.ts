import { useSelectedItems } from '@/contexts/SelectedItemsContext';
import { MessageItem } from '@/types/misc';
import { useCallback } from 'react';

export function useItemSelection() {
  const { images, setImages, meshUpload, setMeshUpload } = useSelectedItems();

  const selectItem = useCallback(
    (item: MessageItem) => {
      if (images.some((image) => image.id === item.id)) {
        const newSelectedImages = images.filter(
          (image) => image.id !== item.id,
        );
        setImages(newSelectedImages);
      } else {
        const newSelectedImages = [...images, item];
        setImages(newSelectedImages);
      }
    },
    [images, setImages],
  );

  return {
    images,
    selectItem,
    setImages,
    meshUpload,
    setMeshUpload,
  };
}
