import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { ObjectUrlImageResolver, type ImageResolver } from './imageResolver'
import { InMemoryImageStorage, type ImageStorage } from './imageStorage'

interface ImageAssets {
  storage: ImageStorage
  resolver: ImageResolver
}

const defaultStorage = new InMemoryImageStorage()
const defaultAssets: ImageAssets = {
  storage: defaultStorage,
  resolver: new ObjectUrlImageResolver(defaultStorage),
}

const ImageAssetsContext = createContext<ImageAssets>(defaultAssets)

interface Props {
  children: ReactNode
  storage?: ImageStorage
  resolver?: ImageResolver
}

export function ImageAssetsProvider({ children, storage, resolver }: Props) {
  const assets = useMemo(() => {
    const selectedStorage = storage ?? new InMemoryImageStorage()
    return {
      storage: selectedStorage,
      resolver: resolver ?? new ObjectUrlImageResolver(selectedStorage),
    }
  }, [resolver, storage])

  return <ImageAssetsContext.Provider value={assets}>{children}</ImageAssetsContext.Provider>
}

export function useImageAssets(): ImageAssets {
  return useContext(ImageAssetsContext)
}
