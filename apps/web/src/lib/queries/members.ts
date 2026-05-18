import { queryOptions } from '@tanstack/react-query'
import { api } from '#/lib/api'

export type WorkspaceMember = {
    id: string
    isOwner: boolean
    lastActiveAt: string
    joinedAt: string
    user: {
        id: string
        name: string
        email: string
        image: string | null
    }
}

export type WorkspaceInvitation = {
    id: string
    email: string
    status: 'pending' | 'accepted' | 'cancelled'
    expiresAt: string
    createdAt: string
    invitedBy: { id: string; name: string }
}

export type InvitationInfo = {
    email: string
    status: 'pending' | 'accepted' | 'cancelled'
    expired: boolean
    workspaceId: string
    workspaceName: string
    workspaceImage: string | null
    invitedBy: string
}

export const membersQuery = (workspaceId: string) =>
    queryOptions({
        queryKey: ['members', workspaceId],
        queryFn: () =>
            api.get<WorkspaceMember[]>(
                `/workspaces/${workspaceId}/members`,
            ),
    })

export const invitationsQuery = (workspaceId: string) =>
    queryOptions({
        queryKey: ['invitations', workspaceId],
        queryFn: () =>
            api.get<WorkspaceInvitation[]>(
                `/workspaces/${workspaceId}/members/invitations`,
            ),
    })

export const invitationInfoQuery = (token: string) =>
    queryOptions({
        queryKey: ['invitation-info', token],
        queryFn: () => api.get<InvitationInfo>(`/invitations/${token}`),
        retry: false,
    })
