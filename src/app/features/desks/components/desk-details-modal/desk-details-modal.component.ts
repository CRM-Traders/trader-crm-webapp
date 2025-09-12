import {
  Component,
  inject,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  Subject,
  takeUntil,
  catchError,
  of,
  finalize,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { LanguageService } from '../../../../core/services/language.service';
import { DesksService } from '../../services/desks.service';
import {
  OfficeDropdownItem,
  OfficeDropdownRequest,
  Desk,
  DeskUpdateRequest,
} from '../../models/desk.model';
import { BrandDropdownItem } from '../../../brands/models/brand.model';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';

@Component({
  selector: 'app-desk-details-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HasPermissionDirective],
  templateUrl: './desk-details-modal.component.html',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class DeskDetailsModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() deskId!: string;
  @ViewChild('officeSearchInput', { static: false })
  officeSearchInput!: ElementRef;

  private fb = inject(FormBuilder);
  private desksService = inject(DesksService);
  private languageService = inject(LanguageService);
  private alertService = inject(AlertService);
  private ngZone = inject(NgZone);
  private destroy$ = new Subject<void>();

  editForm: FormGroup;
  isEditing = false;
  loading = false;
  saving = false;
  desk: Desk | null = null;
  availableOffices: BrandDropdownItem[] = [];
  availableLanguages: any[] = [];

  // Brand dropdown state
  officeSearchTerm = '';
  officePageIndex = 0;
  officePageSize = 20;
  officeTotalCount = 0;
  officeLoading = false;
  officeHasNextPage = false;
  officeDropdownOpen = false;

  // Language dropdown state
  languageDropdownOpen = false;
  languageSearchTerm = '';
  filteredLanguages: any[] = [];

  // Desk type dropdown state
  deskTypeDropdownOpen = false;

  // Keyboard navigation properties
  focusedBrandIndex = -1;
  focusedLanguageIndex = -1;
  focusedDeskTypeIndex = -1;

  deskTypes = [
    { value: 0, label: 'Sales' },
    { value: 1, label: 'Retention' },
  ];

  constructor() {
    this.editForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],
      brandId: ['', [Validators.required]],
      officeSearch: [''],
      type: [0],
      language: ['en'], // Set English as default
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.loadDeskDetails();
    this.initializeSearchObservable();
    this.loadInitialOffices();
    this.loadAvailableLanguages();
    this.filteredLanguages = this.availableLanguages;

    document.addEventListener('mousedown', this.boundGlobalHandler, true);
    document.addEventListener('touchstart', this.boundGlobalHandler, true);
    document.addEventListener('click', this.boundGlobalHandler, true);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    document.removeEventListener('mousedown', this.boundGlobalHandler, true);
    document.removeEventListener('touchstart', this.boundGlobalHandler, true);
    document.removeEventListener('click', this.boundGlobalHandler, true);
  }

  private loadDeskDetails(): void {
    if (!this.deskId) {
      this.alertService.error('Desk ID is required');
      this.modalRef.close();
      return;
    }

    this.loading = true;
    this.desksService
      .getDeskById(this.deskId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load desk details');
          this.modalRef.close();
          return of(null);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((desk) => {
        if (desk) {
          this.desk = desk;
          this.populateForm();
        }
      });
  }

  private populateForm(): void {
    if (!this.desk) return;

    this.editForm.patchValue({
      name: this.desk.name,
      brandId: this.desk.brandId,
      type: this.desk.type,
      language: this.desk.language || '',
      isActive: this.desk.isActive,
    });
  }

  private initializeSearchObservable(): void {
    this.editForm
      .get('officeSearch')
      ?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm: string) => {
        this.officeSearchTerm = searchTerm || '';
        this.resetOfficeDropdown();
        this.loadOffices();
      });
  }

  private loadInitialOffices(): void {
    this.resetOfficeDropdown();
    this.loadOffices();
  }

  private resetOfficeDropdown(): void {
    this.officePageIndex = 0;
    this.availableOffices = [];
    this.officeHasNextPage = false;
  }

  private loadOffices(): void {
    if (this.officeLoading) return;

    this.officeLoading = true;
    const request: OfficeDropdownRequest = {
      pageIndex: this.officePageIndex,
      pageSize: this.officePageSize,
      globalFilter: this.officeSearchTerm,
      sortField: 'name',
      sortDirection: 'asc',
    };

    this.desksService
      .getBrandsDropdown(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to load brands');
          return of({
            items: [],
            totalCount: 0,
            pageIndex: 1,
            pageSize: 20,
            totalPages: 0,
            hasPreviousPage: false,
            hasNextPage: false,
          });
        })
      )
      .subscribe((response) => {
        if (this.officePageIndex === 1) {
          this.availableOffices = response.items;
        } else {
          this.availableOffices = [...this.availableOffices, ...response.items];
        }

        this.officeTotalCount = response.totalCount;
        this.officeHasNextPage = response.hasNextPage;
        this.officeLoading = false;
      });
  }

  onOfficeDropdownScroll(event: any): void {
    const element = event.target;
    const threshold = 100;

    if (
      element.scrollTop + element.clientHeight >=
      element.scrollHeight - threshold
    ) {
      this.loadMoreOffices();
    }
  }

  private loadMoreOffices(): void {
    if (this.officeHasNextPage && !this.officeLoading) {
      this.officePageIndex++;
      this.loadOffices();
    }
  }

  onOfficeSearch(event: any): void {
    const searchTerm = event.target.value;
    this.editForm.patchValue({ officeSearch: searchTerm });
  }

  toggleOfficeDropdown(): void {
    // Close other dropdowns if open
    if (this.languageDropdownOpen) {
      this.languageDropdownOpen = false;
    }
    if (this.deskTypeDropdownOpen) {
      this.deskTypeDropdownOpen = false;
    }

    // Toggle brand dropdown
    this.officeDropdownOpen = !this.officeDropdownOpen;
    if (this.officeDropdownOpen) {
      this.focusedBrandIndex = 0; // Start with first item focused
    }
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.handleGlobalPointerEvent(event);
  }

  private handleGlobalPointerEvent(event: Event): void {
    const target = event.target as HTMLElement;

    const brandDropdown = target.closest('[data-dropdown="brand"]');
    const languageDropdown = target.closest('[data-dropdown="language"]');
    const deskTypeDropdown = target.closest('[data-dropdown="deskType"]');

    if (!brandDropdown) {
      this.officeDropdownOpen = false;
      this.focusedBrandIndex = -1;
    }
    if (!languageDropdown) {
      this.languageDropdownOpen = false;
      this.focusedLanguageIndex = -1;
    }
    if (!deskTypeDropdown) {
      this.deskTypeDropdownOpen = false;
      this.focusedDeskTypeIndex = -1;
    }
  }

  private boundGlobalHandler = (event: Event) => this.ngZone.run(() => this.handleGlobalPointerEvent(event));

  // Language dropdown methods
  toggleLanguageDropdown(): void {
    // Close other dropdowns if open
    if (this.officeDropdownOpen) {
      this.officeDropdownOpen = false;
    }
    if (this.deskTypeDropdownOpen) {
      this.deskTypeDropdownOpen = false;
    }

    // Toggle language dropdown
    this.languageDropdownOpen = !this.languageDropdownOpen;
    if (this.languageDropdownOpen) {
      this.focusedLanguageIndex = -1; // Start with "No specific language" focused
    }
  }

  onLanguageSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.languageSearchTerm = target.value.toLowerCase();

    this.filteredLanguages = this.availableLanguages.filter((lang) =>
      lang.value.toLowerCase().includes(this.languageSearchTerm)
    );
  }

  selectLanguage(lang: any): void {
    if (lang) {
      this.editForm.patchValue({ language: lang.key });
    } else {
      this.editForm.patchValue({ language: '' });
    }
    this.languageDropdownOpen = false;
    this.languageSearchTerm = '';
    this.filteredLanguages = this.availableLanguages;
  }

  getSelectedLanguageName(): string {
    const selectedLanguageKey = this.editForm.get('language')?.value;
    if (!selectedLanguageKey) {
      return 'No specific language';
    }
    const selectedLanguage = this.availableLanguages.find(
      (lang) => lang.key === selectedLanguageKey
    );
    return selectedLanguage ? selectedLanguage.value : 'Select a language...';
  }

  // Desk type dropdown methods
  toggleDeskTypeDropdown(): void {
    // Close other dropdowns if open
    if (this.officeDropdownOpen) {
      this.officeDropdownOpen = false;
    }
    if (this.languageDropdownOpen) {
      this.languageDropdownOpen = false;
    }

    // Toggle desk type dropdown
    this.deskTypeDropdownOpen = !this.deskTypeDropdownOpen;
    if (this.deskTypeDropdownOpen) {
      this.focusedDeskTypeIndex = 0; // Start with first item focused
    }
  }

  selectDeskType(type: any): void {
    this.editForm.patchValue({ type: type.value });
    this.deskTypeDropdownOpen = false;
  }

  getSelectedDeskTypeName(): string {
    const selectedTypeValue = this.editForm.get('type')?.value;
    const selectedType = this.deskTypes.find(
      (type) => type.value === selectedTypeValue
    );
    return selectedType ? selectedType.label : 'Select a desk type...';
  }

  selectOffice(brand: BrandDropdownItem): void {
    this.editForm.patchValue({ brandId: brand.id });
    this.officeDropdownOpen = false;
  }

  getSelectedOfficeName(): string {
    const selectedOfficeId = this.editForm.get('brandId')?.value;
    const selectedOffice = this.availableOffices.find(
      (brand) => brand.id === selectedOfficeId
    );
    return selectedOffice
      ? selectedOffice.value
      : this.desk?.brandName || 'Select an brand';
  }

  private loadAvailableLanguages(): void {
    this.availableLanguages = this.languageService.getAllLanguages();
  }

  getTypeLabel(type: number): string {
    const typeInfo = this.deskTypes.find((t) => t.value === type);
    return typeInfo ? typeInfo.label : `Type ${type}`;
  }

  getTypeClasses(type: number): string {
    switch (type) {
      case 0:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 1:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 2:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  }

  getLanguageLabel(languageCode: string): string {
    const language = this.languageService.getLanguageByKey(languageCode);
    return language || languageCode.toUpperCase();
  }

  startEdit(): void {
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.populateForm();
  }

  saveDesk(): void {
    if (this.editForm.invalid || !this.desk || !this.deskId) return;

    const updateRequest: DeskUpdateRequest = {
      id: this.desk.id,
      name: this.editForm.value.name.trim(),
      brandId: this.editForm.value.brandId,
      type: Number(this.editForm.value.type),
      language: this.editForm.value.language || null,
      isActive: this.editForm.value.isActive,
    };

    this.saving = true;
    this.desksService
      .updateDesk(updateRequest)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to update desk');
          return of(null);
        }),
        finalize(() => (this.saving = false))
      )
      .subscribe((result) => {
        this.alertService.success('Desk updated successfully');
        this.isEditing = false;

        // Update the desk object with new values
        if (this.desk) {
          this.desk = {
            ...this.desk,
            name: this.editForm.value.name.trim(),
            brandId: this.editForm.value.brandId,
            type: this.editForm.value.type,
            language: this.editForm.value.language || null,
            isActive: this.editForm.value.isActive,
            lastModifiedAt: new Date(),
          };
        }

        this.modalRef.close({
          updated: true,
          desk: this.desk,
        });
      });
  }

  onClose(): void {
    // Only return a result if there were actual changes
    if (this.isEditing) {
      this.modalRef.close({
        updated: true,
        desk: this.desk
      });
    } else {
      this.modalRef.close();
    }
  }

  // Keyboard navigation methods for Brand dropdown
  isBrandFocused(index: number): boolean {
    return this.focusedBrandIndex === index;
  }

  setFocusedBrandIndex(index: number): void {
    this.focusedBrandIndex = index;
  }

  onBrandKeydown(event: KeyboardEvent, brand: BrandDropdownItem, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectOffice(brand);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextBrand();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousBrand();
        break;
      case 'Escape':
        this.officeDropdownOpen = false;
        break;
    }
  }

  private focusNextBrand(): void {
    if (this.focusedBrandIndex < this.availableOffices.length - 1) {
      this.focusedBrandIndex++;
    }
  }

  private focusPreviousBrand(): void {
    if (this.focusedBrandIndex > 0) {
      this.focusedBrandIndex--;
    }
  }

  // Keyboard navigation methods for Language dropdown
  isLanguageFocused(index: number): boolean {
    return this.focusedLanguageIndex === index;
  }

  setFocusedLanguageIndex(index: number): void {
    this.focusedLanguageIndex = index;
  }

  onLanguageKeydown(event: KeyboardEvent, lang: any, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectLanguage(lang);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextLanguage();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousLanguage();
        break;
      case 'Escape':
        this.languageDropdownOpen = false;
        break;
    }
  }

  private focusNextLanguage(): void {
    const totalItems = this.filteredLanguages.length + 1; // +1 for "No specific language"
    if (this.focusedLanguageIndex < totalItems - 1) {
      this.focusedLanguageIndex++;
    }
  }

  private focusPreviousLanguage(): void {
    if (this.focusedLanguageIndex > -1) {
      this.focusedLanguageIndex--;
    }
  }

  // Keyboard navigation methods for Desk Type dropdown
  isDeskTypeFocused(index: number): boolean {
    return this.focusedDeskTypeIndex === index;
  }

  setFocusedDeskTypeIndex(index: number): void {
    this.focusedDeskTypeIndex = index;
  }

  onDeskTypeKeydown(event: KeyboardEvent, type: any, index: number): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectDeskType(type);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextDeskType();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousDeskType();
        break;
      case 'Escape':
        this.deskTypeDropdownOpen = false;
        break;
    }
  }

  private focusNextDeskType(): void {
    if (this.focusedDeskTypeIndex < this.deskTypes.length - 1) {
      this.focusedDeskTypeIndex++;
    }
  }

  private focusPreviousDeskType(): void {
    if (this.focusedDeskTypeIndex > 0) {
      this.focusedDeskTypeIndex--;
    }
  }

  // Button keydown handlers for opening dropdowns
  onBrandButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.officeDropdownOpen) {
          this.toggleOfficeDropdown();
        }
        break;
    }
  }

  onLanguageButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.languageDropdownOpen) {
          this.toggleLanguageDropdown();
        }
        break;
    }
  }

  onDeskTypeButtonKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        if (!this.deskTypeDropdownOpen) {
          this.toggleDeskTypeDropdown();
        }
        break;
    }
  }
}
