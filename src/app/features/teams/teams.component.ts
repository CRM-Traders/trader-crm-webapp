import {
  Component,
  OnInit,
  ViewChild,
  TemplateRef,
  inject,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, catchError, of, finalize, tap } from 'rxjs';
import { TeamsService } from './services/teams.service';
import { Team } from './models/team.model';
import { GridComponent } from '../../shared/components/grid/grid.component';
import { AlertService } from '../../core/services/alert.service';
import { ModalService } from '../../shared/services/modals/modal.service';
import { DesksService } from '../desks/services/desks.service';
import { BrandsService } from '../brands/services/brands.service';
import { OfficesService } from '../officies/services/offices.service';
import {
  GridColumn,
  GridAction,
} from '../../shared/models/grid/grid-column.model';
import { TeamCreationModalComponent } from './components/team-creation-modal/team-creation-modal.component';
import { TeamDetailsModalComponent } from './components/team-details-modal/team-details-modal.component';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    GridComponent,
    HasPermissionDirective,
  ],
  templateUrl: './teams.component.html',
  styleUrls: ['./teams.component.scss'],
})
export class TeamsComponent implements OnInit, OnDestroy {
  private teamsService = inject(TeamsService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private desksService = inject(DesksService);
  private brandsService = inject(BrandsService);
  private officesService = inject(OfficesService);

  private destroy$ = new Subject<void>();
  gridId = 'teams-grid';

  @ViewChild('statusCell', { static: true })
  statusCellTemplate!: TemplateRef<any>;

  importLoading = false;
  showDeleteModal = false;
  teamToDelete: Team | null = null;
  totalCount = 0;
  activeCount = 0;

  gridColumns: GridColumn[] = [
    {
      field: 'name',
      header: 'Team Name',
      sortable: true,
      filterable: true,
      cellClass: 'font-medium text-blue-600 hover:text-blue-800 cursor-pointer',
    },
    {
      field: 'deskName',
      header: 'Desk',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated in ngOnInit
    },
    {
      field: 'officeName',
      header: 'Office',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated in ngOnInit
    },
    {
      field: 'brandName',
      header: 'Brand',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [], // Will be populated in ngOnInit
    },
    {
      field: 'isActive',
      header: 'Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: true, label: 'Active' },
        { value: false, label: 'Inactive' },
      ],
    },
    {
      field: 'createdAt',
      header: 'Created Date',
      sortable: true,
      filterable: true,
      type: 'date',
      format: 'short',
    },
    {
      field: 'createdBy',
      header: 'Created By',
      sortable: true,
      filterable: true,
      selector: (row: Team) => row.createdBy || 'System',
    },
    {
      field: 'lastModifiedAt',
      header: 'Last Modified',
      sortable: true,
      filterable: true,
      type: 'date',
      format: 'short',
      selector: (row: Team) => row.lastModifiedAt || 'No Info',
    },
  ];

  gridActions: GridAction[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: 'view',
      action: (item: Team) => this.openDetailsModal(item),
      permission: 79,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'delete',
      action: (item: Team) => this.confirmDelete(item),
      permission: 80,
    },
  ];

  constructor() {}

  ngOnInit(): void {
    this.initializeGridTemplates();
    this.loadTeamStatistics();
    this.loadFilterOptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeGridTemplates(): void {
    const statusColumn = this.gridColumns.find(
      (col) => col.field === 'isActive'
    );
    if (statusColumn) {
      statusColumn.cellTemplate = this.statusCellTemplate;
    }
  }

  private loadFilterOptions(): void {
    this.loadDeskFilterOptions();
    this.loadOfficeFilterOptions();
    this.loadBrandFilterOptions();
  }

  private loadDeskFilterOptions(): void {
    this.desksService
      .getDeskDropdown({ pageIndex: 0, pageSize: 1000 })
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Failed to load desk filter options:', error);
          return of({ items: [] });
        })
      )
      .subscribe((response) => {
        const deskColumn = this.gridColumns.find(
          (col) => col.field === 'deskName'
        );
        if (deskColumn && response && Array.isArray(response.items)) {
          deskColumn.filterOptions = response.items.map((desk: any) => ({
            value: desk.value,
            label: desk.value,
          }));
        }
      });
  }

  private loadOfficeFilterOptions(): void {
    this.officesService
      .getOfficeDropdown({ pageIndex: 0, pageSize: 1000 })
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Failed to load office filter options:', error);
          return of({ items: [] });
        })
      )
      .subscribe((response) => {
        const officeColumn = this.gridColumns.find(
          (col) => col.field === 'officeName'
        );
        if (officeColumn && response && Array.isArray(response.items)) {
          officeColumn.filterOptions = response.items.map((office: any) => ({
            value: office.value,
            label: office.value,
          }));
        }
      });
  }

  private loadBrandFilterOptions(): void {
    this.brandsService
      .getBrandsDropdown({ pageIndex: 0, pageSize: 1000, sortField: 'name', sortDirection: 'asc' as const })
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Failed to load brand filter options:', error);
          return of({ items: [] });
        })
      )
      .subscribe((response: any) => {
        const brandColumn = this.gridColumns.find(
          (col) => col.field === 'brandName'
        );
        if (brandColumn) {
          brandColumn.filterOptions = response.items.map((brand: any) => ({
            value: brand.value,
            label: brand.value,
          }));
        }
      });
  }

  private loadTeamStatistics(): void {
    this.teamsService
      .getTeamStats()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.totalCount = 0;
          this.activeCount = 0;
          return of(null);
        })
      )
      .subscribe((stats: any) => {
        if (stats) {
          this.totalCount = stats.value.totalTeams;
          this.activeCount = stats.value.activeTeams;
        }
      });
  }

  onRowClick(team: Team): void {
    this.openDetailsModal(team);
  }

  openCreateModal(): void {
    const modalRef = this.modalService.open(TeamCreationModalComponent, {
      size: 'lg',
      centered: true,
      closable: true,
    });

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshSpecificGrid();
          this.loadTeamStatistics();
        }
      },
      () => {}
    );
  }

  refreshSpecificGrid(): void {
    const event = new CustomEvent('refreshGrid', {
      detail: { gridId: this.gridId },
    });
    window.dispatchEvent(event);
  }

  openDetailsModal(team: Team): void {
    const modalRef = this.modalService.open(
      TeamDetailsModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        team: team,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.refreshSpecificGrid();
          this.loadTeamStatistics();
        }
      },
      () => {}
    );
  }

  confirmDelete(team: Team): void {
    this.teamToDelete = team;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.teamToDelete = null;
  }

  deleteTeam(): void {
    if (!this.teamToDelete) return;

    this.teamsService
      .deleteTeam(this.teamToDelete.id)
      .pipe(
        takeUntil(this.destroy$),
        tap(() => {
          this.alertService.success('Team deleted successfully');
          this.refreshSpecificGrid();
          this.loadTeamStatistics();
        }),
        catchError((error) => {
          if (error.status === 409) {
            this.alertService.error(
              'Cannot delete team with associated dependencies'
            );
          } else {
            this.alertService.error('Failed to delete team');
          }
          return of(null);
        }),
        finalize(() => {
          this.showDeleteModal = false;
          this.teamToDelete = null;
        })
      )
      .subscribe();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.importFile(input.files[0]);
      input.value = '';
    }
  }

  private importFile(file: File): void {
    this.importLoading = true;

    this.teamsService
      .importTeams(file)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to import teams');
          return of(null);
        }),
        finalize(() => (this.importLoading = false))
      )
      .subscribe((response) => {
        if (response) {
          const message = `Import completed: ${response.successCount} successful, ${response.failureCount} failed`;
          this.alertService.success(message);
          this.refreshSpecificGrid();
          this.loadTeamStatistics();
        }
      });
  }

  onExport(options: any): void {
    const request = {
      sortField: options.sortField,
      sortDirection: options.sortDirection,
      globalFilter: options.globalFilter,
    };

    this.teamsService
      .exportTeams(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to export teams');
          return of(null);
        })
      )
      .subscribe((blob) => {
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `teams_${new Date().toISOString().split('T')[0]}.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.alertService.success('Export completed successfully');
        }
      });
  }

  downloadTemplate(): void {
    this.teamsService
      .downloadImportTemplate()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          if (error.status === 401) {
            this.alertService.error('Unauthorized. Please login again.');
          } else {
            this.alertService.error(
              'Failed to download template. Please try again.'
            );
          }
          return of(null);
        })
      )
      .subscribe((blob) => {
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'teams-import-template.xlsx';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          this.alertService.success('Template downloaded successfully!');
        }
      });
  }
}
