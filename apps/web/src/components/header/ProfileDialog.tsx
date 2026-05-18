import { useState, useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '#/lib/api'
import { useAuthStore } from '#/stores/authStore'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Camera, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ProfileDialog({ open, onOpenChange }: Props) {
    const { session, checkSession } = useAuthStore()
    const user = session?.user

    const { data: profile } = useQuery({
        queryKey: ['auth-profile'],
        queryFn: () => api.get<{ hasPassword: boolean }>('/auth/profile'),
        enabled: open,
        staleTime: 1000 * 60 * 5,
    })

    // perfil
    const [name, setName] = useState(user?.name ?? '')
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // contraseña
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    // mutations
    const profileMutation = useMutation({
        mutationFn: async () => {
            const form = new FormData()
            if (name !== user?.name) form.append('name', name)
            if (avatarFile) form.append('image', avatarFile)
            return api.patch('/auth/profile', form)
        },
        onSuccess: () => {
            toast.success('Perfil actualizado')
            setAvatarFile(null)
            setAvatarPreview(null)
            void checkSession()
        },
        onError: () => toast.error('No se pudo actualizar el perfil'),
    })

    const passwordMutation = useMutation({
        mutationFn: () =>
            api.patch('/auth/change-password', { currentPassword, newPassword }),
        onSuccess: () => {
            toast.success('Contraseña actualizada')
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        },
        onError: (err: any) => {
            const msg: string =
                err?.response?.data?.message ?? 'Error al cambiar la contraseña'
            toast.error(msg)
        },
    })

    // handlers
    function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setAvatarFile(file)
        setAvatarPreview(URL.createObjectURL(file))
    }

    function handleProfileSave() {
        const nameChanged = name.trim() !== user?.name
        const avatarChanged = !!avatarFile
        if (!nameChanged && !avatarChanged) return
        profileMutation.mutate()
    }

    function handlePasswordSave() {
        if (!currentPassword || !newPassword || !confirmPassword) return
        if (newPassword !== confirmPassword) {
            toast.error('Las contraseñas no coinciden')
            return
        }
        passwordMutation.mutate()
    }

    const profileDirty =
        name.trim() !== user?.name || !!avatarFile

    if (!user) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md sm:max-w-md w-full flex flex-col gap-0 p-0">
                <DialogHeader className="px-5 pt-5 pb-4 border-b">
                    <DialogTitle className="text-[14px] font-semibold">
                        Mi perfil
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-6 px-5 py-5 overflow-y-auto">
                    {/* Avatar + nombre */}
                    <section className="flex flex-col gap-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                            Información personal
                        </p>

                        {/* avatar */}
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <Avatar className="size-16">
                                    <AvatarImage
                                        src={avatarPreview ?? user.image ?? undefined}
                                    />
                                    <AvatarFallback className="text-lg">
                                        {user.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                    <Camera size={16} className="text-white" />
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAvatarChange}
                                />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <p className="text-[13px] font-medium">{user.name}</p>
                                <p className="text-[12px] text-muted-foreground">
                                    {user.email}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors text-left mt-0.5"
                                >
                                    Cambiar foto
                                </button>
                            </div>
                        </div>

                        {/* nombre */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-[12px]">Nombre</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Tu nombre"
                                className="h-8 text-[13px]"
                            />
                        </div>

                        {/* email (solo lectura) */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-[12px]">
                                Correo electrónico
                            </Label>
                            <Input
                                value={user.email}
                                disabled
                                className="h-8 text-[13px] opacity-60"
                            />
                        </div>

                        <Button
                            size="sm"
                            className="self-end gap-1.5"
                            disabled={!profileDirty || profileMutation.isPending}
                            onClick={handleProfileSave}
                        >
                            {profileMutation.isPending ? (
                                <Loader2 size={13} className="animate-spin" />
                            ) : (
                                <Check size={13} />
                            )}
                            Guardar cambios
                        </Button>
                    </section>

                    {profile?.hasPassword && (
                    <>
                    <div className="border-t" />

                    {/* Contraseña */}
                    <section className="flex flex-col gap-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                            Cambiar contraseña
                        </p>

                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-[12px]">
                                    Contraseña actual
                                </Label>
                                <Input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) =>
                                        setCurrentPassword(e.target.value)
                                    }
                                    placeholder="••••••••"
                                    className="h-8 text-[13px]"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-[12px]">
                                    Nueva contraseña
                                </Label>
                                <Input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) =>
                                        setNewPassword(e.target.value)
                                    }
                                    placeholder="••••••••"
                                    className="h-8 text-[13px]"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-[12px]">
                                    Confirmar contraseña
                                </Label>
                                <Input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(e.target.value)
                                    }
                                    placeholder="••••••••"
                                    className="h-8 text-[13px]"
                                />
                            </div>
                        </div>

                        <Button
                            size="sm"
                            variant="outline"
                            className="self-end gap-1.5"
                            disabled={
                                !currentPassword ||
                                !newPassword ||
                                !confirmPassword ||
                                passwordMutation.isPending
                            }
                            onClick={handlePasswordSave}
                        >
                            {passwordMutation.isPending ? (
                                <Loader2 size={13} className="animate-spin" />
                            ) : (
                                <Check size={13} />
                            )}
                            Actualizar contraseña
                        </Button>
                    </section>
                    </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
