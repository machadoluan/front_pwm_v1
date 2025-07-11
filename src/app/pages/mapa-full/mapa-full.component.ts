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
export class MapaFullComponent implements OnInit {
  equipamentos: Equipamento[] = [];

  constructor(private equipamentosService: EquipamentosService) { }

  mapboxToken = 'pk.eyJ1IjoibWFjaGFkb2x1YW5qcyIsImEiOiJjbWN5M2NqZ3gwaWZrMmpvanlqcjZoZGpxIn0.BM03_t6aM2hisfSYEZPUWQ';
  mapboxStyle = 'streets-v12'; // Pode usar também 'streets-v12', 'navigation-day-v1', etc.

  options = {
    layers: [

      L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/${this.mapboxStyle}/tiles/{z}/{x}/{y}?access_token=${this.mapboxToken}`, {
        tileSize: 512,
        zoomOffset: -1,
        attribution: '© <a href="https://www.mapbox.com/">Mapbox</a>',
      })

    ],
    zoom: 7, // Estado de Santa Catarina
    center: L.latLng(-27.2423, -50.2189) // Centro aproximado de SC
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
            radius: 5,
            color: cor,
            fillColor: cor,
            fillOpacity: 1
          }).bindPopup(`<b>${e?.nome}</b><br>${e?.endereco}<br>Status: ${e?.status}`);
        });


    });
  }
}
