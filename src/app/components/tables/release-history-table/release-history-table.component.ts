import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HighlightPipe } from '../../../pipes/highlight.pipe'; 

@Component({
  selector: 'app-release-history-table',
  standalone: true,
  imports: [CommonModule, FormsModule, HighlightPipe],
  templateUrl: './release-history-table.component.html',
  styleUrl: './release-history-table.component.css'
})
export class ReleaseHistoryTableComponent implements OnChanges {
  @Input() data!: any; // Input property to receive data from the parent
  @Input() listPerPage!: number;
  @Input() searchTerm: string = ''; // Input property to receive search term from parent
  @Output() publishRequested = new EventEmitter<any>(); // Event emitter for publish action
  
  currentPage = 1;
  
  // Filter properties
  filters = {
    productType: '',
    templateType: '',
    createdBy: '',
    fromDate: '',
    toDate: ''
  };

  // Checkbox selections for multiple filter values
  selectedDocumentationNames: string[] = [];
  selectedProductTypes: string[] = [];
  selectedTemplateTypes: string[] = [];
  selectedCreatedBy: string[] = [];
  
  // Filter dropdown states
  isDocumentationNameFilterOpen = false;
  isProductTypeFilterOpen = false;
  isTemplateTypeFilterOpen = false;
  isCreatedByFilterOpen = false;
  isPublishedDateFilterOpen = false;
  
  // Unique values for filter dropdowns
  uniqueDocumentationNames: string[] = [];
  uniqueProductTypes: string[] = [];
  uniqueTemplateTypes: string[] = [];
  uniqueCreatedBy: string[] = [];

  // ViewChild references for dropdown elements
  @ViewChild('documentationNameDropdown') documentationNameDropdown!: ElementRef;
  @ViewChild('productTypeDropdown') productTypeDropdown!: ElementRef;
  @ViewChild('templateTypeDropdown') templateTypeDropdown!: ElementRef;
  @ViewChild('publishedDateDropdown') publishedDateDropdown!: ElementRef;
  @ViewChild('createdByDropdown') createdByDropdown!: ElementRef;

  get totalPages(): number {
    const filteredLength = this.filteredData.length;
    return filteredLength > 0 ? Math.ceil(filteredLength / this.listPerPage) : 1;
  }

  get filteredData() {
    if (!this.data || this.data.length === 0) {
      return [];
    }
    
    let filtered = [...this.data];
    
    // Apply checkbox filters (multiple selections)
    if (this.selectedDocumentationNames.length > 0) {
      filtered = filtered.filter(item => this.selectedDocumentationNames.includes(item.pdf_filename));
    }
    if (this.selectedProductTypes.length > 0) {
      filtered = filtered.filter(item => this.selectedProductTypes.includes(item.product_type));
    }
    if (this.selectedTemplateTypes.length > 0) {
      filtered = filtered.filter(item => this.selectedTemplateTypes.includes(item.template_type));
    }
    if (this.selectedCreatedBy.length > 0) {
      filtered = filtered.filter(item => this.selectedCreatedBy.includes(item.created_by));
    }
    
    // Apply legacy single-value filters (for backward compatibility)
    if (this.filters.productType) {
      filtered = filtered.filter(item => item.product_type === this.filters.productType);
    }
    if (this.filters.templateType) {
      filtered = filtered.filter(item => item.template_type === this.filters.templateType);
    }
    if (this.filters.createdBy) {
      filtered = filtered.filter(item => item.created_by === this.filters.createdBy);
    }
    
    // Apply date range filter
    if (this.filters.fromDate || this.filters.toDate) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.release_date);
        const fromDate = this.filters.fromDate ? new Date(this.filters.fromDate) : null;
        const toDate = this.filters.toDate ? new Date(this.filters.toDate) : null;
        
        if (fromDate && toDate) {
          return itemDate >= fromDate && itemDate <= toDate;
        } else if (fromDate) {
          return itemDate >= fromDate;
        } else if (toDate) {
          return itemDate <= toDate;
        }
        return true;
      });
    }
    
    return filtered;
  }

  get paginatedItems() {
    const filtered = this.filteredData;
    const start = (this.currentPage - 1) * this.listPerPage;
    return filtered.slice(start, start + this.listPerPage);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      // Reset to first page when data changes
      this.currentPage = 1;
      // Update unique values for filter dropdowns
      this.updateUniqueValues();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  getFirstLetter(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '';
  }

  // Filter methods
  updateUniqueValues() {
    if (!this.data || this.data.length === 0) {
      this.uniqueDocumentationNames = [];
      this.uniqueProductTypes = [];
      this.uniqueTemplateTypes = [];
      this.uniqueCreatedBy = [];
      return;
    }

    this.uniqueDocumentationNames = [...new Set(this.data.map((item: any) => item.pdf_filename).filter(Boolean))] as string[];
    this.uniqueProductTypes = [...new Set(this.data.map((item: any) => item.product_type).filter(Boolean))] as string[];
    this.uniqueTemplateTypes = [...new Set(this.data.map((item: any) => item.template_type).filter(Boolean))] as string[];
    this.uniqueCreatedBy = [...new Set(this.data.map((item: any) => item.created_by).filter(Boolean))] as string[];
  }

  toggleFilter(filterType: string) {
    switch (filterType) {
      case 'documentationName':
        this.isDocumentationNameFilterOpen = !this.isDocumentationNameFilterOpen;
        break;
      case 'productType':
        this.isProductTypeFilterOpen = !this.isProductTypeFilterOpen;
        break;
      case 'templateType':
        this.isTemplateTypeFilterOpen = !this.isTemplateTypeFilterOpen;
        break;
      case 'createdBy':
        this.isCreatedByFilterOpen = !this.isCreatedByFilterOpen;
        break;
      case 'publishedDate':
        this.isPublishedDateFilterOpen = !this.isPublishedDateFilterOpen;
        break;
    }
  }

  applyFilter(filterType: string, value: string) {
    switch (filterType) {
      case 'productType':
        this.filters.productType = value;
        this.isProductTypeFilterOpen = false;
        break;
      case 'templateType':
        this.filters.templateType = value;
        this.isTemplateTypeFilterOpen = false;
        break;
      case 'createdBy':
        this.filters.createdBy = value;
        this.isCreatedByFilterOpen = false;
        break;
      case 'publishedDate':
        // This case is no longer used with the new calendar picker
        this.isPublishedDateFilterOpen = false;
        break;
    }
    this.currentPage = 1; // Reset to first page when filter is applied
  }

  clearFilter(filterType: string) {
    switch (filterType) {
      case 'productType':
        this.filters.productType = '';
        break;
      case 'templateType':
        this.filters.templateType = '';
        break;
      case 'createdBy':
        this.filters.createdBy = '';
        break;
      case 'publishedDate':
        this.filters.fromDate = '';
        this.filters.toDate = '';
        break;
    }
    this.currentPage = 1; // Reset to first page when filter is cleared
  }

  clearAllFilters() {
    this.filters = {
      productType: '',
      templateType: '',
      createdBy: '',
      fromDate: '',
      toDate: ''
    };
    // Clear checkbox selections
    this.selectedDocumentationNames = [];
    this.selectedProductTypes = [];
    this.selectedTemplateTypes = [];
    this.selectedCreatedBy = [];
    this.currentPage = 1;
  }

  hasActiveFilters(): boolean {
    return Object.values(this.filters).some(filter => filter !== '') ||
           this.selectedDocumentationNames.length > 0 ||
           this.selectedProductTypes.length > 0 ||
           this.selectedTemplateTypes.length > 0 ||
           this.selectedCreatedBy.length > 0;
  }

  // Date filter methods
  hasDateFilter(): boolean {
    return this.filters.fromDate !== '' || this.filters.toDate !== '';
  }

  onDateRangeChange() {
    // Validate date range
    if (this.filters.fromDate && this.filters.toDate) {
      const fromDate = new Date(this.filters.fromDate);
      const toDate = new Date(this.filters.toDate);
      
      if (fromDate > toDate) {
        // If from date is after to date, clear the to date
        this.filters.toDate = '';
      }
    }
    
    this.currentPage = 1; // Reset to first page when date filter changes
  }

  clearDateFilter() {
    this.filters.fromDate = '';
    this.filters.toDate = '';
    this.currentPage = 1;
  }

  closeDateFilter() {
    this.isPublishedDateFilterOpen = false;
  }

  // Click outside to close dropdowns
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    
    // Check if click is outside all dropdown containers
    if (this.documentationNameDropdown && !this.documentationNameDropdown.nativeElement.contains(target)) {
      this.isDocumentationNameFilterOpen = false;
    }
    if (this.productTypeDropdown && !this.productTypeDropdown.nativeElement.contains(target)) {
      this.isProductTypeFilterOpen = false;
    }
    if (this.templateTypeDropdown && !this.templateTypeDropdown.nativeElement.contains(target)) {
      this.isTemplateTypeFilterOpen = false;
    }
    if (this.publishedDateDropdown && !this.publishedDateDropdown.nativeElement.contains(target)) {
      this.isPublishedDateFilterOpen = false;
    }
    if (this.createdByDropdown && !this.createdByDropdown.nativeElement.contains(target)) {
      this.isCreatedByFilterOpen = false;
    }
  }

  // Close all dropdowns
  closeAllDropdowns() {
    this.isDocumentationNameFilterOpen = false;
    this.isProductTypeFilterOpen = false;
    this.isTemplateTypeFilterOpen = false;
    this.isPublishedDateFilterOpen = false;
    this.isCreatedByFilterOpen = false;
  }

  // Enhanced toggle filter with close others functionality
  toggleFilterExclusive(filterType: string) {
    // Close all other dropdowns first
    this.closeAllDropdowns();
    
    // Then toggle the requested one
    this.toggleFilter(filterType);
  }

  // Checkbox selection methods for Product Type
  isProductTypeSelected(type: string): boolean {
    return this.selectedProductTypes.includes(type);
  }

  toggleProductTypeSelection(type: string): void {
    const index = this.selectedProductTypes.indexOf(type);
    if (index > -1) {
      this.selectedProductTypes.splice(index, 1);
    } else {
      this.selectedProductTypes.push(type);
    }
    this.currentPage = 1; // Reset to first page when filter changes
  }

  hasProductTypeSelections(): boolean {
    return this.selectedProductTypes.length > 0;
  }

  clearProductTypeFilter(): void {
    this.selectedProductTypes = [];
    this.currentPage = 1;
  }

  // Checkbox selection methods for Template Type
  isTemplateTypeSelected(type: string): boolean {
    return this.selectedTemplateTypes.includes(type);
  }

  toggleTemplateTypeSelection(type: string): void {
    const index = this.selectedTemplateTypes.indexOf(type);
    if (index > -1) {
      this.selectedTemplateTypes.splice(index, 1);
    } else {
      this.selectedTemplateTypes.push(type);
    }
    this.currentPage = 1; // Reset to first page when filter changes
  }

  hasTemplateTypeSelections(): boolean {
    return this.selectedTemplateTypes.length > 0;
  }

  clearTemplateTypeFilter(): void {
    this.selectedTemplateTypes = [];
    this.currentPage = 1;
  }

  // Checkbox selection methods for Created By
  isCreatedBySelected(creator: string): boolean {
    return this.selectedCreatedBy.includes(creator);
  }

  toggleCreatedBySelection(creator: string): void {
    const index = this.selectedCreatedBy.indexOf(creator);
    if (index > -1) {
      this.selectedCreatedBy.splice(index, 1);
    } else {
      this.selectedCreatedBy.push(creator);
    }
    this.currentPage = 1; // Reset to first page when filter changes
  }

  hasCreatedBySelections(): boolean {
    return this.selectedCreatedBy.length > 0;
  }

  clearCreatedByFilter(): void {
    this.selectedCreatedBy = [];
    this.currentPage = 1;
  }

  // Checkbox selection methods for Documentation Name
  isDocumentationNameSelected(name: string): boolean {
    return this.selectedDocumentationNames.includes(name);
  }

  toggleDocumentationNameSelection(name: string): void {
    const index = this.selectedDocumentationNames.indexOf(name);
    if (index > -1) {
      this.selectedDocumentationNames.splice(index, 1);
    } else {
      this.selectedDocumentationNames.push(name);
    }
    this.currentPage = 1; // Reset to first page when filter changes
  }

  hasDocumentationNameSelections(): boolean {
    return this.selectedDocumentationNames.length > 0;
  }

  clearDocumentationNameFilter(): void {
    this.selectedDocumentationNames = [];
    this.currentPage = 1;
  }

  // Handle publish click event
  onPublishClick(item: any): void {
    this.publishRequested.emit(item);
  }

  // Handle download click event
  onDownloadClick(item: any): void {
    if (!item.pdf_url) {
      console.error('No PDF URL available for download');
      return;
    }

    const link = document.createElement('a');
    link.href = item.pdf_url;
    link.download = item.pdf_filename || 'document.pdf';
    link.target = '_blank';
    
    // For cross-origin requests, we need to fetch and download
    if (this.isCrossOrigin(item.pdf_url)) {
      this.downloadCrossOriginFile(item.pdf_url, item.pdf_filename || 'document.pdf');
    } else {
      // For same-origin, simple download works
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Check if URL is cross-origin
  private isCrossOrigin(url: string): boolean {
    try {
      const urlObj = new URL(url, window.location.href);
      return urlObj.origin !== window.location.origin;
    } catch (e) {
      return false;
    }
  }

  // Download cross-origin file using fetch API
  private downloadCrossOriginFile(url: string, filename: string): void {
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.blob();
      })
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch(error => {
        console.error('Download failed:', error);
        // Fallback: open in new tab
        window.open(url, '_blank');
      });
  }
}
