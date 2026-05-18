import { Button } from '#/components/ui/button'
import { FolderPlus } from 'lucide-react'
import { CreateFolderDialog } from './CreateFolderDialog'
import { useState } from 'react'

export const CreateFolderButton = ({
    workspaceId,
    currentFolderId,
}: {
    workspaceId: string
    currentFolderId: string | null
}) => {
    const [open, setOpen] = useState(false)

    return (
        <CreateFolderDialog
            workspaceId={workspaceId}
            currentFolderId={currentFolderId}
            open={open}
        >
            <Button
                variant="outline"
                size="sm"
                className="bg-primary/10 hover:bg-primary/20 border-primary/20 hover:border-primary/30 gap-2"
                onClick={() => setOpen(true)}
            >
                <FolderPlus size={16} />
                Nueva carpeta
            </Button>
        </CreateFolderDialog>
    )
}
