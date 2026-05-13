import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Device } from '../../models/device.model';
import { DeviceService } from '../../services/device.service';

@Component({
  selector: 'app-device-list',
  imports: [RouterLink],
  templateUrl: './device-list.component.html',
})
export class DeviceListComponent implements OnInit {
  private readonly deviceService = inject(DeviceService);

  devices = signal<Device[]>([]);
  loading = signal(false);
  error = signal('');

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');

    this.deviceService
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (devices) => this.devices.set(devices),
        error: () => this.error.set('No se pudieron cargar los dispositivos.'),
      });
  }
}
