import { Component, OnInit } from '@angular/core';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import * as L from 'leaflet';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { EquipamentosService } from '../../services/equipamentos.service';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmationService } from 'primeng/api';
import { ToastrService } from '../../services/toastr.service';

export interface Equipamento {
  id: number
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
  equipamentos: Equipamento[] = [];
  selectedEquipamentos: Equipamento[] = [];


  constructor(private equipamentosService: EquipamentosService, private fb: FormBuilder, private confirmationService: ConfirmationService,
    private toastrService: ToastrService,

  ) {
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
    this.loadEquipamentos();
  }



  options = {
    layers: [
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap contributors'
      })
    ],
    zoom: 7, // Estado de Santa Catarina
    center: L.latLng(-27.2423, -50.2189) // Centro aproximado de SC
  };


  layers: L.Layer[] = [];





  drop(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.equipamentos, event.previousIndex, event.currentIndex);

    // Aqui você pode enviar para o backend a nova ordem
    this.salvarOrdemEquipamentos();
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
      console.log('Termo em minusculas:', termoEmMinusculas);
      lista = lista.filter(c =>
        c.nome.toLowerCase().includes(termoEmMinusculas) ||
        c.endereco?.toLowerCase().includes(termoEmMinusculas)
      );
    }

    return lista;
  }

  toggleSemSinal() {
    this.filterStatus = this.filterStatus === false ? null : false;
    console.log('Filtro sem sinal:', this.filterStatus);
    this.atualizarMapa();
  }


  toggleComSinal() {
    this.filterStatus = this.filterStatus === true ? null : true;
    console.log('Filtro com sinal:', this.filterStatus);
    this.atualizarMapa();
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
        this.loadEquipamentos();

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

  loadEquipamentos() {
    this.equipamentosService.getList().subscribe(data => {
      this.equipamentos = data;
      console.log('Equipamentos carregados:', this.equipamentos);

      const ordemSalva = localStorage.getItem('ordemEquipamentos');
      if (ordemSalva) {
        const idsOrdenados = JSON.parse(ordemSalva);
        this.filteredEquipamentos.sort((a, b) =>
          idsOrdenados.indexOf(a.id) - idsOrdenados.indexOf(b.id)
        );
      }

      // Gera os marcadores para cada equipamento com lat/lon válidos
      this.layers = this.equipamentos
        .filter(e => typeof e?.lat === 'number' && typeof e?.lon === 'number')
        .map(e => {
          const cor = e.status === 'online' ? '#12BEA7' : '#FF4C4C'; // verde ou vermelho

          // Para adicionar um botão no popup do marcador, você pode incluir um botão HTML no conteúdo do bindPopup.
          // Exemplo: um botão "Editar" que chama uma função JavaScript (você pode adaptar para Angular conforme necessário).
          return L.circleMarker([e?.lat, e?.lon], {
            radius: 10,
            color: cor,
            fillColor: cor,
            fillOpacity: 1
          }).bindPopup(`
            <b>${e?.nome}</b><br>
            ${e?.endereco}<br>
            Status: ${e?.status}<br>
            <button onclick="window.open('https://www.google.com/maps?q=${e.lat},${e.lon}', '_blank')">
    Abrir Google Maps
  </button>
          `);
        });


    });
  }

  atualizarMapa() {
    const equipamentosFiltrados = this.equipamentos
      .filter(e => this.coordenadasValidas(e))
      .filter(e => {
        if (this.filterStatus === null) return true;
        const statusBoolean = e.status === 'online';
        return statusBoolean === this.filterStatus;
      });

    this.layers = equipamentosFiltrados.map(e => {
      const cor = e.status === 'online' ? '#12BEA7' : '#FF4C4C';
      return L.circleMarker([e.lat, e.lon], {
        radius: 10,
        color: cor,
        fillColor: cor,
        fillOpacity: 1
      }).bindPopup(`<b>${e.nome}</b><br>${e.endereco}<br>Status: ${e.status}`);
    });
  }
  coordenadasValidas(e: Equipamento): boolean {
    return typeof e.lat === 'number' &&
      typeof e.lon === 'number' &&
      !isNaN(e.lat) &&
      !isNaN(e.lon);
  }


  select(e: Equipamento, event: MouseEvent) {
    // interrompe o click de borbulha para o div.card
    event.stopPropagation();

    const index = this.selectedEquipamentos.findIndex(eq => eq.id === e.id);

    if (index > -1) {
      // Já está selecionado → remove
      this.selectedEquipamentos.splice(index, 1);
    } else {
      // Não está → adiciona
      this.selectedEquipamentos.push(e);
    }

    console.log('Equipamentos selecionados:', this.selectedEquipamentos);
  }

  isSelecionado(equipamento: Equipamento): boolean {
    return this.selectedEquipamentos.some(eq => eq.id === equipamento.id);
  }

  selectOrOpenDialog(equipamento: Equipamento) {
    if (this.selectedEquipamentos.length === 0) {
      this.openEditDialog(equipamento);
    } else {
      this.select(equipamento, new MouseEvent('click'));
    }
  }

  deletarEquipamentos(equipamentos: Equipamento[]) {
    const ids = equipamentos.map(e => e.id)

    console.log(ids)

    this.confirmationService.confirm({
      message: `Você deseja deletar permanente?`,
      header: 'Deletar equipamentos',
      rejectLabel: 'Cancel',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Delete',
        severity: 'danger',
      },

      accept: () => {
        this.equipamentosService.deleteAll(ids).subscribe({
          next: (res) => {
            this.toastrService.showSucess('Equipamentos excluidos.')
          },
          error: (err) => {
            this.toastrService.showError('Tente novamente mais tarde.')
          },
          complete: () => {
            this.loadEquipamentos()
            this.selectedEquipamentos = []
          }
        })
      },

      reject: () => {
      },
    });
  }

  salvarOrdemEquipamentos() {
    const idsOrdenados = this.filteredEquipamentos.map(eq => eq.id); // ou outro identificador único
    localStorage.setItem('ordemEquipamentos', JSON.stringify(idsOrdenados));
  }
}
