import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Device } from '../../models/device.model';
import { DeviceService } from '../../services/device.service';

@Component({
  selector: 'app-device-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './device-detail.component.html',
})
export class DeviceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly deviceService = inject(DeviceService);

  device = signal<Device | null>(null);
  loading = signal(false);
  error = signal('');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isNaN(id)) {
      this.load(id);
    } else {
      this.error.set('Dispositivo no valido.');
    }
  }

  private load(id: number): void {
    this.loading.set(true);
    this.error.set('');

    this.deviceService
      .getById(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (device) => this.device.set(device),
        error: () => this.error.set('No se pudo cargar el dispositivo.'),
      });
  }
}
