import { DriveBreadcrumb } from '#/components/dashboard/drive/breadcrumb/DriveBreadcrumb'
import { CreateFolderButton } from '#/components/dashboard/drive/create-folder/CreateFolderButton'
import { DriveGrid } from '#/components/dashboard/drive/DriveGrid'
import { UploadFilesDialog } from '#/components/dashboard/drive/upload/UploadFilesDialog'
import { Button } from '#/components/ui/button'
import { driveContentQuery } from '#/lib/queries/drive'
import { tagsQuery, type WorkspaceTag } from '#/lib/queries/tags'

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { zodValidator } from '@tanstack/zod-adapter'
import { ChevronDown, FolderUp, Loader2, Search, Tag, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'

const driveSearchParams = z.object({
    folderId: z.string().optional(),
    q: z.string().optional(),
    tagId: z.string().optional(),
})

export const Route = createFileRoute('/dashboard/$workspaceId/drive/')({
    component: RouteComponent,
    validateSearch: zodValidator(driveSearchParams),
})

function RouteComponent() {
    const { workspaceId } = Route.useParams()
    const { folderId: currentFolderId, q, tagId } = Route.useSearch()
    const navigate = useNavigate({ from: Route.fullPath })

    // input local que se sincroniza con la url tras 350ms
    const [inputValue, setInputValue] = useState(q ?? '')
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        setInputValue(q ?? '')
    }, [q])

    const handleSearch = (value: string) => {
        setInputValue(value)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            navigate({
                search: (prev) => ({
                    ...prev,
                    q: value.trim() || undefined,
                }),
            })
        }, 350)
    }

    const clearSearch = () => {
        setInputValue('')
        navigate({ search: (prev) => ({ ...prev, q: undefined }) })
    }

    const setTagFilter = (id: string | undefined) => {
        navigate({ search: (prev) => ({ ...prev, tagId: id }) })
    }

    const { data, isLoading } = useQuery(
        driveContentQuery(workspaceId, currentFolderId, q, tagId),
    )

    const { data: tags } = useQuery(tagsQuery(workspaceId))
    const activeTag = tags?.find((t) => t.id === tagId)

    const [uploadOpen, setUploadOpen] = useState(false)

    return (
        <div className="flex flex-col gap-4">
            <div className="sticky top-0 z-10 backdrop-blur-sm border-b border-black/5 dark:border-white/5 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <DriveBreadcrumb
                    workspaceId={workspaceId}
                    currentFolderId={currentFolderId}
                />

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* chip del tag activo si hay filtro */}
                    {activeTag && (
                        <button
                            type="button"
                            onClick={() => setTagFilter(undefined)}
                            className="flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12px] font-medium transition-colors shrink-0"
                            style={{
                                background: activeTag.color ? `${activeTag.color}20` : 'rgba(0,0,0,0.06)',
                                color: activeTag.color ?? undefined,
                                border: `1px solid ${activeTag.color ?? '#94a3b8'}40`,
                            }}
                            title="Quitar filtro de etiqueta"
                        >
                            <Tag size={11} />
                            {activeTag.name}
                            <X size={11} className="opacity-60" />
                        </button>
                    )}

                    {/* input de busqueda */}
                    <div className="flex items-center gap-2 h-8 flex-1 sm:flex-none sm:w-52 min-w-0 rounded-4xl border border-input bg-input/30 px-3 py-1 transition-colors outline-none">
                        <Search size={16} className="text-muted-foreground shrink-0" />
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Buscar en drive..."
                            className="h-full w-full bg-transparent outline-none placeholder:text-muted-foreground text-sm"
                        />
                        {inputValue && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* dropdown para filtrar por etiqueta */}
                    <TagFilterDropdown
                        tags={tags ?? []}
                        activeTagId={tagId}
                        onSelect={setTagFilter}
                    />

                    <CreateFolderButton
                        workspaceId={workspaceId}
                        currentFolderId={currentFolderId || null}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!currentFolderId}
                        onClick={() => setUploadOpen(true)}
                        className="bg-green-500/10 hover:bg-green-500/20 border-green-500/20 hover:border-green-500/30 gap-2 shrink-0"
                    >
                        <FolderUp size={16} />
                        <span className="hidden sm:inline">Subir</span>
                    </Button>
                </div>
            </div>

            {currentFolderId && (
                <UploadFilesDialog
                    open={uploadOpen}
                    onOpenChange={setUploadOpen}
                    workspaceId={workspaceId}
                    folderId={currentFolderId}
                />
            )}

            <div className="px-4 pb-4">
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <DriveGrid
                    items={data?.items ?? []}
                    workspaceId={workspaceId}
                />
            )}
            </div>
        </div>
    )
}

// dropdown de filtro por tag

function TagFilterDropdown({
    tags,
    activeTagId,
    onSelect,
}: {
    tags: WorkspaceTag[]
    activeTagId: string | undefined
    onSelect: (id: string | undefined) => void
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0 h-8 px-2.5"
                    title="Filtrar por etiqueta"
                >
                    <Tag size={14} />
                    <span className="hidden sm:inline text-xs">Etiquetas</span>
                    <ChevronDown size={12} className="opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                {tags.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-3 text-center">
                        No hay etiquetas
                    </p>
                ) : (
                    <>
                        {activeTagId && (
                            <>
                                <DropdownMenuItem
                                    onClick={() => onSelect(undefined)}
                                    className="text-muted-foreground"
                                >
                                    <X size={13} />
                                    Quitar filtro
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </>
                        )}
                        {tags.map((tag) => (
                            <DropdownMenuItem
                                key={tag.id}
                                onClick={() =>
                                    onSelect(tag.id === activeTagId ? undefined : tag.id)
                                }
                                className="gap-2"
                            >
                                <span
                                    className="size-2.5 rounded-full shrink-0"
                                    style={{ background: tag.color ?? '#94a3b8' }}
                                />
                                <span className="flex-1 truncate">{tag.name}</span>
                                {tag.id === activeTagId && (
                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                        activa
                                    </span>
                                )}
                                {tag.fileCount > 0 && (
                                    <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                                        {tag.fileCount}
                                    </span>
                                )}
                            </DropdownMenuItem>
                        ))}
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
