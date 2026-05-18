import type { ClientWorkspaceData } from '@intellidocs/types'
import { create } from 'zustand'
import { useWorkspacesStore } from './workspacesStore'

interface WorkspaceStore {
    workspace: ClientWorkspaceData | null
    // Establece el workspace activo y registra la actividad del usuario
    setWorkspace: (workspace?: ClientWorkspaceData | null) => void
    // Solo sincroniza los datos sin registrar actividad (usar desde realtime)
    syncWorkspace: (workspace: ClientWorkspaceData) => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
    workspace: null,
    setWorkspace: (workspace) => {
        if (workspace)
            useWorkspacesStore.getState().updateLastActive(workspace.id)
        set({ workspace })
    },
    syncWorkspace: (workspace) => {
        set({ workspace })
    },
}))
