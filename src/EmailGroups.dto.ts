export interface CreateEmailGroupDto {
    id: number,
    name: string;
    keywords: string[];
    chatId: string;
}

export interface UpdateEmailGroupDto {
    name?: string;
    keywords?: string[];
    chatId?: string;
}