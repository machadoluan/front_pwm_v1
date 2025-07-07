import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { HeaderComponent } from './components/header/header.component';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule, HeaderComponent, ConfirmDialog, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Dashboard-PWM';

  excludedRoutes = ['/mapa'];

  constructor(public router: Router, private route: ActivatedRoute,) { }


  showDefaultLayout(): boolean {
    const currentRoute = this.router.url.split('?')[0].split('#')[0]; // Pega só o caminho puro, sem query e fragmentos
    return this.excludedRoutes.includes(currentRoute);
  }
}
