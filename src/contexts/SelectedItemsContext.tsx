import { MessageItem, MeshUploadState } from '@/types/misc';
import { createContext, Dispatch, SetStateAction, useContext } from 'react';

type SelectedItemsContextType = {
  images: MessageItem[];
  setImages: Dispatch<SetStateAction<MessageItem[]>>;
  meshUpload: MeshUploadState | null;
  setMeshUpload: Dispatch<SetStateAction<MeshUploadState | null>>;
};

export const SelectedItemsContext = createContext<SelectedItemsContextType>({
  images: [],
  setImages: () => {},
  meshUpload: null,
  setMeshUpload: () => {},
});

export const useSelectedItems = () => {
  const context = useContext(SelectedItemsContext);
  if (!context) {
    throw new Error(
      'useSelectedItems must be used within a SelectedItemsProvider',
    );
  }
  return context;
};
