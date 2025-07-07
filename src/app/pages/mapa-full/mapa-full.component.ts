import { Component, OnInit } from '@angular/core';
import { EquipamentosService } from '../../services/equipamentos.service';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import * as L from 'leaflet';

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
  selector: 'app-mapa-full',
  imports: [LeafletModule],
  templateUrl: './mapa-full.component.html',
  styleUrl: './mapa-full.component.scss'
})
export class MapaFullComponent  implements OnInit{
  equipamentos: Equipamento[] = [];

  constructor(private equipamentosService: EquipamentosService) { }

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

  ngOnInit(): void {
    this.loadEquipamentos()
  }


  loadEquipamentos() {
    this.equipamentosService.getList().subscribe(data => {
      this.equipamentos = data;
      console.log('Equipamentos carregados:', this.equipamentos);

      // Gera os marcadores para cada equipamento com lat/lon válidos
      this.layers = this.equipamentos
        .filter(e => typeof e?.lat === 'number' && typeof e?.lon === 'number')
        .map(e => {
          const cor = e.status === 'online' ? '#12BEA7' : '#FF4C4C'; // verde ou vermelho

          return L.circleMarker([e?.lat, e?.lon], {
            radius: 10,
            color: cor,
            fillColor: cor,
            fillOpacity: 1
          }).bindPopup(`<b>${e?.nome}</b><br>${e?.endereco}<br>Status: ${e?.status}`);
        });


    });
  }
}
