import { Component, OnInit } from '@angular/core';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import * as L from 'leaflet';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { EquipamentosService } from '../../services/equipamentos.service';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

export interface Equipamento {
  nome: string;
  contato: string;
  ip: string;
  endereco: string;
  ultimaAtualizacao: string;
  status: string;
  lat: number;
  lon: number;
}


@Component({
  selector: 'app-equipamentos',
  imports: [LeafletModule, DragDropModule, CommonModule, FormsModule, ReactiveFormsModule, DialogModule, InputTextModule],
  templateUrl: './equipamentos.component.html',
  styleUrl: './equipamentos.component.scss'
})
export class EquipamentosComponent implements OnInit {
  searchEquipamentos: string = '';
  filterStatus: boolean | null = null;
  display: boolean = false;
  editEquipamento: FormGroup
  selectedEquipamento: Equipamento | null = null;

  constructor(private equipamentosService: EquipamentosService, private fb: FormBuilder) {
    // Inicializar o formulário
    this.editEquipamento = this.fb.group({
      nome: [{ value: '', disabled: true }, Validators.required],
      contato: [{ value: '', disabled: true }],
      ip: [{ value: '', disabled: true }],
      endereco: [''],
      ultimaAtualizacao: [{ value: '', disabled: true }],
      status: [{ value: '', disabled: true }],
      lat: [null],
      lon: [null]
    });

  }

  ngOnInit() {
    this.equipamentosService.getList().subscribe(data => {
      this.equipamentos = data;
      console.log('Equipamentos carregados:', this.equipamentos);

      // Gera os marcadores para cada equipamento com lat/lon válidos
     this.layers = this.equipamentos
  .filter(e => typeof e.lat === 'number' && typeof e.lon === 'number')
  .map(e => {
    const cor = e.status === 'online' ? '#12BEA7' : '#FF4C4C'; // verde ou vermelho

    return L.circleMarker([e.lat, e.lon], {
      radius: 10,
      color: cor,
      fillColor: cor,
      fillOpacity: 1
    }).bindPopup(`<b>${e.nome}</b><br>${e.endereco}<br>Status: ${e.status}`);
  });


    });

  }



 options = {
  layers: [
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors'
    })
  ],
  zoom: 4, // Brasil todo
  center: L.latLng(-14.2350, -51.9253) // Centro aproximado do Brasil
};


  layers: L.Layer[] = [];



  equipamentos: Equipamento[] = [];


  drop(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.equipamentos, event.previousIndex, event.currentIndex);

    // Aqui você pode enviar para o backend a nova ordem
    this.salvarOrdemNoBackend();
  }

  salvarOrdemNoBackend() {
    // Exemplo:
    // this.http.post('/api/ordem-equipamentos', this.equipamentos).subscribe()
    console.log('Nova ordem salva:', this.equipamentos);
  }

  get filteredEquipamentos(): any[] {
    let lista = this.equipamentos;

    if (this.filterStatus !== null) {
      lista = lista.filter(c => {
        const statusBoolean = c.status === 'online';
        return statusBoolean === this.filterStatus;
      });
    }

    if (this.searchEquipamentos && this.searchEquipamentos.trim() !== '') {
      const termoEmMinusculas = this.searchEquipamentos.trim().toLowerCase();
      lista = lista.filter(c =>
        c.nome.toLowerCase().includes(termoEmMinusculas) ||
        c.endereco.toLowerCase().includes(termoEmMinusculas)
      );
    }

    return lista;
  }

  toggleSemSinal() {
    this.filterStatus = this.filterStatus === false ? null : false;
    console.log('Filtro sem sinal:', this.filterStatus);
  }

  toggleComSinal() {
    this.filterStatus = this.filterStatus === true ? null : true;
    console.log('Filtro com sinal:', this.filterStatus);
  }

  get onlineCount(): number {
    return this.equipamentos.filter(e => e.status === 'online').length;
  }

  get offlineCount(): number {
    return this.equipamentos.filter(e => e.status === 'offline').length;
  }

  formatarData(dataIso: string): string {
    const data = new Date(dataIso);
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const horas = String(data.getHours()).padStart(2, '0');
    const minutos = String(data.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} - ${horas}:${minutos}`;
  }

  onDialogHide() {
    this.editEquipamento.reset()
  }
  salvarEquipamento() {
    if (this.editEquipamento.valid && this.selectedEquipamento) {
      const endereco = this.editEquipamento.value.endereco;
      const id = (this.selectedEquipamento as any).id;

      this.equipamentosService.editarEquipamento(id, endereco).subscribe(response => {
        console.log('Equipamento atualizado com sucesso:', response);
      }, error => {
        console.error('Erro ao atualizar equipamento:', error);
      });
      this.display = false;
    } else {
      console.error('Formulário inválido ou equipamento não selecionado');
    }
  }
  openEditDialog(equipamento: Equipamento) {
    this.display = true;
    this.selectedEquipamento = equipamento;
    this.editEquipamento.patchValue({
      nome: equipamento.nome,
      contato: equipamento.contato,
      ip: equipamento.ip,
      endereco: equipamento.endereco,
      ultimaAtualizacao: this.formatarData(equipamento.ultimaAtualizacao),
      status: equipamento.status,
      lat: equipamento.lat,
      lon: equipamento.lon
    });
  }
}
