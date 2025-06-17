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
import { Subject, takeUntil, catchError, of, finalize } from 'rxjs';
import { TeamsService } from './services/teams.service';
import { Team } from './models/team.model';
import { GridComponent } from '../../shared/components/grid/grid.component';
import { AlertService } from '../../core/services/alert.service';
import { ModalService } from '../../shared/services/modals/modal.service';
import {
  GridColumn,
  GridAction,
} from '../../shared/models/grid/grid-column.model';
import { TeamCreationModalComponent } from './components/team-creation-modal/team-creation-modal.component';
import { TeamDetailsModalComponent } from './components/team-details-modal/team-details-modal.component';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, GridComponent],
  templateUrl: './teams.component.html',
  styleUrls: ['./teams.component.scss'],
})
export class TeamsComponent implements OnInit, OnDestroy {
  private teamsService = inject(TeamsService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);

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
      field: 'departmentName',
      header: 'Department',
      sortable: true,
      filterable: true,
    },
    {
      field: 'deskName',
      header: 'Desk',
      sortable: true,
      filterable: true,
    },
    {
      field: 'brandName',
      header: 'Brand',
      sortable: true,
      filterable: true,
    },
    {
      field: 'isActive',
      header: 'Status',
      sortable: true,
      filterable: true,
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
      selector: (row: Team) => row.lastModifiedAt || null,
    },
  ];

  gridActions: GridAction[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: 'view',
      action: (item: Team) => this.openDetailsModal(item),
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: 'edit',
      action: (item: Team) => this.openDetailsModal(item),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'delete',
      action: (item: Team) => this.confirmDelete(item),
    },
  ];

  constructor() {}

  ngOnInit(): void {
    this.initializeGridTemplates();
    this.loadTeamStatistics();
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

  private loadTeamStatistics(): void {
    this.teamsService
      .getTeamStats()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading team statistics:', error);
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
      () => {
        // Modal dismissed
      }
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
        catchError((error) => {
          if (error.status === 409) {
            this.alertService.error(
              'Cannot delete team with associated dependencies'
            );
          } else {
            this.alertService.error('Failed to delete team');
          }
          console.error('Error deleting team:', error);
          return of(null);
        }),
        finalize(() => {
          this.showDeleteModal = false;
          this.teamToDelete = null;
        })
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Team deleted successfully');
          this.refreshSpecificGrid();
          this.loadTeamStatistics();
        }
      });
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
          console.error('Error importing teams:', error);
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
          console.error('Error exporting teams:', error);
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
          console.error('Error downloading template:', error);
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
