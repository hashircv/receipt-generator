interface FileSystemHandlePermissionDescriptor { mode?: 'read' | 'readwrite' }

interface FileSystemFileHandle {
  readonly kind: 'file'
  readonly name: string
  getFile(): Promise<File>
  createWritable(): Promise<FileSystemWritableFileStream>
}

interface FileSystemDirectoryHandle {
  readonly kind: 'directory'
  readonly name: string
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>
  values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
}

interface FileSystemWritableFileStream {
  write(data: Blob | BufferSource | string): Promise<void>
  close(): Promise<void>
}

interface Window {
  showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite'; id?: string; startIn?: string }) => Promise<FileSystemDirectoryHandle>
}
