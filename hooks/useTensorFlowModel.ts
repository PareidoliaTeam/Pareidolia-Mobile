/*
 * Author: Armando Vega
 * Date Created: 9 Feb 2026
 * 
 * Last Modified By: Armando Vega
 * Date Last Modified: 9 Feb 2026
 * 
 * Description: Custom hook to load a TensorFlow Lite model using react-native-fast-tflite.
 */

import { getInfoAsync } from 'expo-file-system/legacy';
import { Paths } from 'expo-file-system/next';
import { useEffect, useState } from 'react';
import { loadTensorflowModel } from 'react-native-fast-tflite';

export function useTensorflowModel(modelPath: any) {
  const [model, setModel] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!modelPath) return

    let mounted = true
    let loadedModel: any = null

    const load = async () => {
      try {
        setLoading(true)
        let resolvedUrl: string | number = modelPath
        if (typeof modelPath === 'string') {
          let fileUri = modelPath
          const info = await getInfoAsync(fileUri)
          if (!info.exists) {
            // Stored path may be stale (e.g. iOS sandbox UUID rotated after reinstall).
            // Re-derive the path from just the filename using the current document directory.
            const filename = fileUri.replace(/^.*\//, '')
            const fallback = `${Paths.document.uri}models/${filename}`
            const fallbackInfo = await getInfoAsync(fallback)
            if (!fallbackInfo.exists) {
              throw new Error(`Model file not found. Tried:\n  ${fileUri}\n  ${fallback}`)
            }
            fileUri = fallback
          }
          resolvedUrl = fileUri
        }
        const source = typeof resolvedUrl === 'number' ? resolvedUrl : { url: resolvedUrl as string }
        loadedModel = await loadTensorflowModel(source)
        
        if (mounted) {
          setModel(loadedModel)
          setLoading(false)
        } else {
          loadedModel?.release?.()
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error)
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      mounted = false
      loadedModel?.release?.()
    }
  }, [modelPath])

  return { model, loading, error }
}