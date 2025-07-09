import { Routes } from '@angular/router';
import { KeywordListComponent } from './pages/keyword-list/keyword-list.component';
import { EquipamentosComponent } from './pages/equipamentos/equipamentos.component';
import { MapaFullComponent } from './pages/mapa-full/mapa-full.component';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
    },
    {
        path: 'equipamentos',
        loadComponent: () => import('./pages/equipamentos/equipamentos.component').then(m => m.EquipamentosComponent)
    },
    {
        path: 'mapa',
        loadComponent: () => import('./pages/mapa-full/mapa-full.component').then(m => m.MapaFullComponent)
    },
];
