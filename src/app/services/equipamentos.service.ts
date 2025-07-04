import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface Equipamento {
  nome: string;
  lat: number;
  lon: number;
}


@Injectable({
  providedIn: 'root'
})


export class EquipamentosService {

  private apiUrl = `${environment.apiUrl}/equipamentos`;

  constructor(private http: HttpClient) { }


  getList(): Observable<any> {
    return this.http.get<Equipamento[]>(this.apiUrl)
  }


  editarEquipamento(id: number, endereco: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/endereco`, { endereco });
  }


}
