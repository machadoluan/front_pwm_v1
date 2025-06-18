// dashboard.component.ts
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Alert, AlertClientService } from '../../services/alert.service';
import { CommonModule } from '@angular/common';
import { KeywordService } from '../../services/keyword.service';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { InputTextModule } from 'primeng/inputtext';
import { ChipsModule } from 'primeng/chips';
import { AddEmailDto, EmailService } from '../../services/email.service';
import { TelegramService } from '../../services/telegram.service';
import { DialogModule } from 'primeng/dialog';
import { Client } from '../../../cliente.dto';
import { ReactiveFormsModule } from '@angular/forms';
import { NotifysComponent } from '../../components/notifys/notifys.component';
import { NgxMaskDirective } from 'ngx-mask';
import { ContratosService } from '../../services/contratos.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from '../../services/toastr.service';
import { environment } from '../../../environments/environment';
import { EmailGrupsService } from '../../services/email-grups.service';
import { CreateEmailGroupDto } from '../../../EmailGroups.dto';
import { debounceTime, distinctUntilChanged } from 'rxjs';
interface EmailWithGroup {
  email: string;
  chatId: string;
  groupName?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgxMaskDirective, CommonModule, FormsModule, InputTextModule, OverlayBadgeModule, ChipsModule, DialogModule, ReactiveFormsModule, NotifysComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  @Output() notifyClicked = new EventEmitter<void>();
  alerts: (Alert & { _showRaw?: boolean })[] = [];
  keywords: string[] = [];
  remetentes: any[] = [];
  blockTags: string[] = [];
  emails: EmailWithGroup[] = [];
  newKeyword = '';
  newTagBlocked = '';
  stats: Record<string, number> = {};
  listEmails: EmailWithGroup[] = [];
  displayEmailDialog = false;
  selectedEmail!: EmailWithGroup;
  displayCriarCliente: boolean = false;
  displayCriarEmailGroup: boolean = false;
  displayCriarEquipamento: boolean = false;
  editclient: Client | null = null;
  editEmailGroup: CreateEmailGroupDto | null = null;
  clientForm: FormGroup;
  emailGroupForm: FormGroup;
  tags: string[] = [];
  tagsEmail: string[] = [];
  editingIndex = -1;
  newTag = '';
  showNotify = false;
  filterStatus: boolean | null = null;
  searchTerm: string = '';
  searchTermEmails: string = '';
  searchTermEquipamentos: string = '';
  status: { qrCode?: string; isReady?: boolean } = {};
  polling: any;
  client: Client[] = []
  equipamentos: any[] = []
  equipamentoForm: FormGroup;
  editingIndexEquipamento = -1;
  qrCode: string = '';
  showQrCode: boolean = false
  isReady: boolean = false
  displayDialog: boolean = false;
  GroupsEmails: CreateEmailGroupDto[] = []

  newEmail: AddEmailDto = {
    email: '',
    senha: '',
    chatId: ''
  };
  emailBlocked: string = '';

  private lastAlertCount = 0;
  private whatasppApi = environment.apiWhatsapp

  constructor(
    private alertClient: AlertClientService,
    private kwClient: KeywordService,
    private emailService: EmailService,
    private telegramService: TelegramService,
    private fb: FormBuilder,
    private contratosService: ContratosService,
    private emailGrupsService: EmailGrupsService,
    private http: HttpClient,
    private toastrService: ToastrService
  ) {
    this.clientForm = this.fb.group({
      nome: ['', Validators.required],
      telefone: ['', [Validators.required, Validators.pattern(/^\d{10,11}$/)]],
      // endereco: ['', Validators.required]
    });

    this.emailGroupForm = this.fb.group({
      name: ['', Validators.required],
      chatId: ['', [Validators.required, Validators.pattern(/^-?\d{7,15}$/)]],
      groupName: [{ value: '', disabled: true }, Validators.required]
      // endereco: ['', Validators.required]
    });

    this.equipamentoForm = this.fb.group({
      nome: ['', Validators.required],
      localidade: ['', Validators.required],
      ip: ['', Validators.required]
    });
  }




  ngOnInit() {
    this.loadKeywords();
    this.loadEmail();
    this.loadContratos();
    this.loadEmailBlocked();
    this.loadGroupsEmail();
    this.verificarStatus()
    this.kwClient.getKeywordsBlocked().subscribe({
      next: (data: any[]) => {
        this.blockTags = data;
      },
      error: (error) => {
        console.error('Erro ao carregar tags bloqueadas:', error);
      }
    })

    // Chama pela primeira vez e em polling
    this.loadAlerts();
    // setInterval(() => this.loadAlerts(), 5000);


    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('Notificações permitidas!');
          } else {
            console.warn('Usuário negou ou ignorou a notificação.');
          }
        });
      }
    }

    this.emailGroupForm.get('chatId')?.valueChanges
      .pipe(
        debounceTime(500), // evita chamadas a cada tecla
        distinctUntilChanged()
      )
      .subscribe(chatId => {
        this.telegramService.getChatInfo(chatId).subscribe({
          next: res => {
            this.emailGroupForm.patchValue({
              groupName: res.result?.title
            });
          },
          error: err => {
            console.error('Erro ao obter info do grupo:', err);
            this.emailGroupForm.patchValue({
              groupName: 'Grupo ou chat inválido!'
            });
          }
        });
      });
  }

  onNotifyClick() {
    this.showNotify = true
  }

  onCloseNotify() {
    this.showNotify = false;
  }


  private previousAlertCount = 0;

  private loadAlerts() {
    this.alertClient.getAlerts().subscribe(data => {

      this.previousAlertCount = data.length;
      if (this.alerts.length !== data.length) {
        this.alerts = data;
      }
      this.calculateStats();
    });
  }


  private loadKeywords() {
    this.kwClient.getKeywords()
      .subscribe(data => {
        this.keywords = data;
        // Depois de atualizar keywords, recarrega alerts pra stats ficar consistentes
        this.loadAlerts();
      });
  }

  addKeyword() {
    const word = this.newKeyword.trim();
    if (!word) {
      this.toastrService.showError('Preencha o campo de palavra');
      return;
    }
    this.kwClient.addKeyword(word)
      .subscribe(res => {
        if (res.added) {
          this.loadKeywords();
        }
        this.newKeyword = '';
      });
  }

  removeKeyword(word: string) {
    this.kwClient.removeKeyword(word)
      .subscribe(() => this.loadKeywords());
  }

  private calculateStats() {
    const counts: Record<string, number> = {};

    for (const kw of this.keywords) {
      const upper = kw.toUpperCase();
      const qtd = this.alerts.filter(a =>
        a.aviso.toUpperCase().includes(upper)
      ).length;
      if (qtd > 0) {
        counts[kw] = qtd;
      }
    }

    this.stats = counts;
    console.log('STATS POR KEYWORD:', this.stats);
  }


  blockEmail() {
    const email = this.emailBlocked.trim();
    if (!email) {
      this.toastrService.showError('Preencha o campo de email');
      return;
    }
    this.emailService.addEmailBlocked(email)
      .subscribe(res => {
        if (res.added) {
          this.loadEmailBlocked();
        }
        this.emailBlocked = '';
      });
  }

  loadEmailBlocked() {
    this.emailService.getEmailBlocked().subscribe({
      next: (data: any[]) => {
        this.remetentes = data.map(remetente => remetente.email);
      },
    })
  }

  unblockEmail(email: string) {
    this.emailService.unblockEmail(email).subscribe({
      next: (data: any) => {
        this.loadEmailBlocked();
      },
    })
  }


  addTagBlocked() {
    const tag = this.newTagBlocked.trim();
    if (!tag) {
      this.toastrService.showError('Preencha o campo de tag');
      return;
    }
    this.kwClient.addKeywordBlocked(tag).subscribe({
      next: (data: any) => {
        this.loadTagBlocked();
        this.newTagBlocked = '';
      },
    })
  }

  loadTagBlocked() {
    this.kwClient.getKeywordsBlocked().subscribe({
      next: (data: any[]) => {
        this.blockTags = data;
      },
    })
  }

  removeTagBlocked(tag: string) {
    this.kwClient.removeKeywordBlocked(tag).subscribe({
      next: (data: any) => {
        this.loadTagBlocked();
      },
    })
  }

  addEmail() {
    if (this.newEmail.email === '' || this.newEmail.senha === '' || this.newEmail.chatId === '') {
      this.toastrService.showError('Preencha todos os campos');
      return;
    }
    this.emailService.addEmail(this.newEmail).subscribe({
      next: (data: any) => {
        this.loadEmail();
        this.newEmail = {
          email: '',
          senha: '',
          chatId: ''
        };
      },
    })
  }

  loadEmail() {
    this.emailService.getEmail().subscribe(data => {
      // inicializa o array com groupName vazio
      this.emails = data.map((email: any) => ({ ...email, groupName: '' }));
      // para cada email, busca o título do grupo e preenche
      this.emails.forEach(email => {
        this.telegramService.getChatInfo(email.chatId).subscribe({
          next: res => {
            email.groupName = res.result?.title ?? `Grupo ${email.chatId}`;
          },
          error: err => {
            console.error('Erro ao obter info do grupo:', err);
            email.groupName = `Grupo ${email.chatId}`;
          }
        });
      });
      console.log(this.emails);
    });
  }


  private getGroupName(chatId: string): void {
    this.telegramService.getChatInfo(chatId).subscribe({
      next: (response) => {
        if (response.ok && response.result) {
          console.log(response.result.title);
          return response.result.title;
        }
      },
      error: (error) => {
        console.error('Erro ao obter informações do grupo:', error);
        return `Grupo ${chatId}`;
      }
    });
  }

  removeEmail(email: string) {
    this.emailService.removeEmail(email).subscribe({
      next: (data: any) => {
        this.loadEmail();
      },
    })
  }

  showEmailDialog(email: EmailWithGroup) {
    this.selectedEmail = email;
    this.displayEmailDialog = true;
  }

  editClient(cliente: Client, index: number) {
    this.editclient = cliente;
    console.log(this.editclient);

    this.editingIndex = index;
    // abre diálogo
    this.displayCriarCliente = true;

    // preenche apenas os controles existentes
    this.clientForm.patchValue({
      nome: cliente.nome,
      telefone: cliente.telefone,
      endereco: cliente.endereco
    });

    // carrega as tags no array de edição
    this.tags = [...cliente.tags];

    // limpa o campo de nova tag
    this.newTag = '';
  }

  editGroup(email: CreateEmailGroupDto, index: number) {
    this.editEmailGroup = email;
    console.log(this.editEmailGroup);

    this.editingIndex = index;
    // abre diálogo
    this.displayCriarEmailGroup = true;

    this.telegramService.getChatInfo(email.chatId).subscribe({
      next: res => {
        this.emailGroupForm.patchValue({
          groupName: res.result?.title
        });
      },
      error: err => {
        console.error('Erro ao obter info do grupo:', err);
      }
    });

    // preenche apenas os controles existentes
    this.emailGroupForm.patchValue({
      name: email.name,
      chatId: email.chatId
    });

    // carrega as tags no array de edição
    this.tagsEmail = [...email.keywords];

    // limpa o campo de nova tag
    this.newTag = '';
  }

  openDialog() {
    this.displayCriarCliente = true;
  }

  openDialogEmail() {
    this.displayCriarEmailGroup = true;
  }

  onDialogHide() {
    this.clientForm.reset();
    this.emailGroupForm.reset();

    this.tags = [];
    this.tagsEmail = [];
    this.newTag = '';
    this.editclient = null;
    this.editEmailGroup = null;
  }

  addTag() {
    const tag = this.newTag.trim();
    if (tag && !this.tags.includes(tag)) {
      this.tags.push(tag);
    }
    this.newTag = '';
  }

  addTagEmail() {
    const tag = this.newTag.trim();
    if (tag && !this.tagsEmail.includes(tag)) {
      this.tagsEmail.push(tag);
    }
    this.newTag = '';
  }

  // Remove tag pelo índice
  removeTag(index: number) {
    this.tags.splice(index, 1);
  }
  removeTagEmail(index: number) {
    this.tagsEmail.splice(index, 1);
  }

  createClient() {
    if (this.clientForm.invalid) return;


    console.log('Clientes atuais:', this.client);
  }


  get dialogHeader(): string {
    return this.editingIndex > -1 ? 'Dados do cliente' : 'Criar um novo cliente';
  }

  formatarTelefone(telefone: string): string {
    if (!telefone) return '';

    const apenasNumeros = telefone.replace(/\D/g, '');

    if (apenasNumeros.length === 11) {
      // Formato com 9 dígitos
      return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 7)}-${apenasNumeros.slice(7)}`;
    } else if (apenasNumeros.length === 10) {
      // Formato com 8 dígitos
      return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 6)}-${apenasNumeros.slice(6)}`;
    }

    return telefone; // fallback
  }

  loadContratos() {
    this.contratosService.getContratos().subscribe((contratos) => {
      this.client = contratos;
    });
  }

  loadGroupsEmail() {
    this.emailGrupsService.getEmails().subscribe((emails) => {
      this.GroupsEmails = emails;
      console.log(this.GroupsEmails)
    });
  }

  createContrato() {
    const payload: Client = {
      ...this.clientForm.value,
      tags: [...this.tags],
      sinal: false
    };

    if (this.editingIndex > -1) {
      this.contratosService.updateContrato(this.editclient?.id!, payload).subscribe(() => {
        this.loadContratos();
        this.clientForm.reset();
        this.tags = [];
        this.editingIndex = -1;
        this.displayCriarCliente = false;
        this.editclient = null;
      });
    }
    else {
      this.contratosService.createContrato(payload).subscribe((contrato) => {
        console.log(contrato);
        this.loadContratos();
        this.clientForm.reset();
        this.tags = [];
        this.editingIndex = -1;
        this.displayCriarCliente = false;
        this.editclient = null;
      });
    }
  }

  createEmailGroup() {
    const payload: CreateEmailGroupDto = {
      ...this.emailGroupForm.value,
      keywords: [...this.tagsEmail],
      sinal: false
    };

    if (this.editingIndex > -1) {
      this.emailGrupsService.updateEmail(this.editEmailGroup?.id!, payload).subscribe(() => {
        this.loadGroupsEmail();
        this.emailGroupForm.reset();
        this.tagsEmail = [];
        this.editingIndex = -1;
        this.displayCriarEmailGroup = false;
        this.editclient = null;
      });
    }
    else {
      this.emailGrupsService.createEmail(payload).subscribe((contrato) => {
        console.log(contrato);
        this.loadGroupsEmail();
        this.emailGroupForm.reset();
        this.tagsEmail = [];
        this.editingIndex = -1;
        this.displayCriarEmailGroup = false;
        this.editclient = null;
      });
    }
  }



  deleteContrato() {
    console.log(this.editclient);

    this.contratosService.deleteContrato(this.editclient?.id!).subscribe((contrato) => {
      this.loadContratos();
      this.clientForm.reset();
      this.tags = [];
      this.editingIndex = -1;
      this.displayCriarCliente = false;
      this.editclient = null;
      this.editclient = null;
    });
  }

  deleteEmail() {
    console.log(this.editclient);

    this.emailGrupsService.deleteEmail(this.editEmailGroup?.id!).subscribe((contrato) => {
      this.loadEmail();
      this.emailGroupForm.reset();
      this.tagsEmail = [];
      this.editingIndex = -1;
      this.displayCriarEmailGroup = false;
      this.editEmailGroup = null;
    });
  }

  get filteredClients(): Client[] {
    let lista = this.client;
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const termoEmMinusculas = this.searchTerm.trim().toLowerCase();
      lista = lista.filter(c =>
        // supondo que o campo seja `c.nome`
        c.nome.toLowerCase().includes(termoEmMinusculas) ||
        c.telefone.toLowerCase().includes(termoEmMinusculas) ||
        c.endereco.toLowerCase().includes(termoEmMinusculas)
      );
    }
    return lista;
  }

  get filteredGroups(): CreateEmailGroupDto[] {
    let lista = this.GroupsEmails;
    if (this.searchTermEmails && this.searchTermEmails.trim() !== '') {
      const termoEmMinusculas = this.searchTermEmails.trim().toLowerCase();
      lista = lista.filter(c =>
        // supondo que o campo seja `c.nome`
        c.name.toLowerCase().includes(termoEmMinusculas) ||
        c.chatId.toLowerCase().includes(termoEmMinusculas)
      );
    }
    return lista;
  }


  openDialogWhats() {
    this.displayDialog = true;
    this.conectarWhatsapp();
  }

  conectarWhatsapp() {
    if (this.polling) {
      clearInterval(this.polling);
    }

    this.status = {};
    this.showQrCode = true;

    const fetchQRCode = () => {
      this.http.get(`${this.whatasppApi}/whatsapp/qr-code`, { responseType: 'text' }).subscribe({
        next: (res: any) => {
          try {
            const data = JSON.parse(res);
            this.qrCode = data.qrCode;
            this.isReady = data.isReady;

            if (this.isReady && this.polling) {
              clearInterval(this.polling);
              this.displayDialog = false;

            }
          } catch (error) {
            console.error('Erro ao interpretar JSON do servidor', error);
          }
        },
        error: err => {
          console.error('Erro na requisição QR Code:', err);
        }
      });
    };

    // 🔹 Requisição imediata
    fetchQRCode();

    // 🔁 Depois continua com o polling a cada 1 segundo
    this.polling = setInterval(fetchQRCode, 1000);
  }


  verificarStatus() {
    this.http.get(`${this.whatasppApi}/whatsapp/qr-code`, { responseType: 'text' }).subscribe({
      next: (res: any) => {
        try {
          const data = JSON.parse(res);
          this.isReady = data.isReady;

          if (this.isReady) {
            clearInterval(this.polling);
          }
        } catch (error) {
          console.error('Erro ao interpretar JSON do servidor', error);
        }
      }
    });
  }


  toggleSemSinal() {
    this.filterStatus = this.filterStatus === false ? null : false;
    console.log('Filtro sem sinal:', this.filterStatus);
  }

  toggleComSinal() {
    this.filterStatus = this.filterStatus === true ? null : true;
    console.log('Filtro com sinal:', this.filterStatus);
  }


}
