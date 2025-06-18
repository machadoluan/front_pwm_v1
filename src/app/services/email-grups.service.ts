import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Client } from '../../cliente.dto';
import { environment } from '../../environments/environment';
import { CreateEmailGroupDto, UpdateEmailGroupDto } from '../../EmailGroups.dto';

@Injectable({
    providedIn: 'root'
})

export class EmailGrupsService {
    private apiUrl = `${environment.apiUrl}/email-groups`;

    constructor(private http: HttpClient) { }

    getEmails(): Observable<CreateEmailGroupDto[]> {
        return this.http.get<CreateEmailGroupDto[]>(`${this.apiUrl}`);
    }

    createEmail(Email: CreateEmailGroupDto): Observable<Client> {
        return this.http.post<Client>(`${this.apiUrl}`, Email);
    }

    updateEmail(id: number, Email: UpdateEmailGroupDto): Observable<UpdateEmailGroupDto> {
        return this.http.put<UpdateEmailGroupDto>(`${this.apiUrl}/${id}`, Email);
    }

    deleteEmail(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
