import { Component,  ElementRef, HostListener, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { UserService } from '../../services/user.service';
import { DocumentationService } from '../../services/documentation.service';
import { OnboardingService } from '../../services/onboarding.service';
import { ApiService } from '../../services/api.service';
import { ReleaseHistoryTableComponent } from '../../components/tables/release-history-table/release-history-table.component';
import { Router, TitleStrategy } from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';
import { Subscription } from 'rxjs';
import jsPDF from "jspdf";

@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [CommonModule,FormsModule, ReleaseHistoryTableComponent, MarkdownModule ],
  templateUrl: './documentation.component.html',
  styleUrl: './documentation.component.css'
})
export class DocumentationComponent implements OnInit, OnDestroy {
  // user data
  userName: string = 'User Name';
  userRole: string = 'Product Owner';
  selectedOption1 = '';  
  selectedOption2 = '';  
  // list number
  imagePath ='./app/resources/icons/paste-url-icon.svg';
  listNumber = 3;
  // documentation Pages
  documentationLandingPage = false;
  documentationGeneratingPage = false; 
  documentationGeneratedPage = false;
  hasVisitedGeneratedPage = false; // Track if user has visited the generated page 
  // products
  products: string[] = [];
  selectedProduct: string = "";
  templates: any[] = [];
  // sources
  sources: { newSource: string }[] = [];
  PdfSources: File[] = [];
  selectedTemplate: any = 'Select Template';
  generatedContent: any = '';
  releaseHistory: any[] = [];
  filteredReleaseHistory: any[] = [];
  searchTerm: string = '';
  private subscriptions: Subscription[] = []; // Subscriptions for cleanup

  isOpen = false;
  generateTemplateDropdown = false;
  isTemplatesDropdownOpen = false;
  isViewSourcesDropdownOpen = false
  isProductDropdownOpen = false;
  isGenProductDropdownOpen = false;
  isProductDropdownBotOpen = false;
  isFilterDropdownOpen = false;
  pdfNewSource: string = '';
  newSource: string = '';
  generateDoc = false;
  filters =['Type', 'Status', 'Published date', 'Created by'];
  isModalOpen = false; // Initial state (modal is closed)
  isPublishModalOpen = false; // Initial state (publish modal is closed)
  showChatBox = false;
  isGeneratingDocumentation: boolean = false;
  isPublishingDocumentation: boolean = false;
  isDeletingDocumentation: boolean = false;
  private refreshTimeout: any = null;
  releaseNotes: string = '';
  generatedFileName: string = '';
  //download pdf url
  pdfUrl: string = '';
  pdfUrlError: string = '';
  isPdfUrlValid: boolean = false;
  
  // Publish modal form data
  publishTitle: string = '';
  publishUrl: string = '';
  
  // Selected documentation item for publishing
  selectedDocumentationForPublish: any = null;
  
  // Documentation name for generation
  documentationName: string = '';
  
  // Custom alert modal properties
  isAlertModalOpen: boolean = false;
  alertTitle: string = '';
  alertMessage: string = '';
  alertType: 'success' | 'error' | 'warning' | 'info' = 'info';
  alertButtonText: string = 'OK';
  alertButtonSecondaryText: string = '';
  alertCallback: (() => void) | null = null;
  
  // Delete confirmation modal properties
  isDeleteConfirmModalOpen: boolean = false;
  deleteConfirmDocumentName: string = '';
  deleteConfirmDocumentId: string = '';
  deleteConfirmCallback: (() => void) | null = null;

  // constructor
  constructor(private userService: UserService, private documentationService: DocumentationService, private router: Router, private onboardingService: OnboardingService, private apiService: ApiService ) {}

  // ngOnInit
  ngOnInit() {
    // Subscribe to user service changes
    this.subscriptions.push(
      this.userService.userName$.subscribe(name => {
        this.userName = name || 'User Name';
      })
    );
    
    this.subscriptions.push(
      this.userService.userRole$.subscribe(role => {
        this.userRole = role || 'Product Owner';
      })
    );
    // Get products
    if(this.onboardingService.getProductList().length > 0) {
        this.products = this.onboardingService.getProductList();
        this.selectedProduct = this.onboardingService.getSelectedProduct();
        console.log('Initial product loaded:', this.selectedProduct);
        console.log('Initial product ID:', this.onboardingService.getSelectedProductId());
        // Check if full product list (with IDs) is also loaded
        if(this.onboardingService.getFullProductList().length === 0) {
          console.warn('Product list exists but full product list (with IDs) is empty. Fetching from API...');
          this.gettingProductListFromApi();
        } else {
          console.log('Full product list already loaded:', this.onboardingService.getFullProductList().length, 'products');
        }
    } else {
        console.log('No products in onboarding service, fetching from API...');
        this.gettingProductListFromApi();
    }
    
    // Subscribe to selected product changes from onboarding service (for user settings)
    // This subscription is mainly for when products are changed from other components (like settings)
    this.subscriptions.push(
      this.onboardingService.getSelectedProduct$().subscribe(product => {
        console.log("========== ONBOARDING SERVICE PRODUCT SUBSCRIPTION ==========");
        console.log("Onboarding service product changed to:", product);
        console.log("Current component product:", this.selectedProduct);
        console.log("Should update?", product && product !== this.selectedProduct);
        
        if (product && product !== this.selectedProduct && product !== '') {
          console.log("✓ Updating documentation service to match onboarding service");
          // Update LOCAL product first to prevent loops
          this.selectedProduct = product;
          // Update the documentation service to keep them in sync (but don't trigger from the subscription)
          this.documentationService.setSelectedProduct(product);
          // Fetch templates with the updated product
          console.log("✓ Fetching templates from onboarding subscription");
          this.fetchTemplatesForProduct();
        } else {
          console.log("✗ Skipping update - product unchanged or empty");
        }
        console.log("================================================================");
      })
    );
   
    // Subscribe to documentation service state changes
    this.subscriptions.push(
      this.documentationService.documentationLandingPage$.subscribe(state => {
        this.documentationLandingPage = state;
      })
    );
    
    this.subscriptions.push(
      this.documentationService.documentationGeneratingPage$.subscribe(state => {
        this.documentationGeneratingPage = state;
      })
    );
    
    this.subscriptions.push(
      this.documentationService.documentationGeneratedPage$.subscribe(state => {
        this.documentationGeneratedPage = state;
      })
    );
    
    // Restore documentation state from service
    this.documentationService.restoreDocumentationState();
    
    // Get initial state from service
    this.documentationLandingPage = this.documentationService.getDocumentationLandingPage();
    this.documentationGeneratingPage = this.documentationService.getDocumentationGeneratingPage(); 
    this.documentationGeneratedPage = this.documentationService.getDocumentationGeneratedPage(); 
    
    // Subscribe to form data from service
    this.subscriptions.push(
      this.documentationService.sources$.subscribe(sources => {
        this.sources = sources;
        this.updateGenerateButtonState();
      })
    );
    
    this.subscriptions.push(
      this.documentationService.pdfSources$.subscribe(pdfSources => {
        this.PdfSources = pdfSources;
        this.updateGenerateButtonState();
      })
    );
    
    this.subscriptions.push(
      this.documentationService.selectedTemplate$.subscribe(template => {
        this.selectedTemplate = template;
      })
    );
    
    // Subscribe to documentation service product changes (mainly for keeping UI in sync)
    // Template fetching is handled by the onboarding service subscription above
    this.subscriptions.push(
      this.documentationService.selectedProduct$.subscribe(product => {
        console.log("========== DOCUMENTATION SERVICE PRODUCT SUBSCRIPTION ==========");
        console.log("Documentation service product changed to:", product);
        console.log("Current component product:", this.selectedProduct);
        
        // Only update the local product if it's different
        // Don't fetch templates here to avoid duplicate API calls
        if (product && product !== this.selectedProduct) {
          console.log("✓ Syncing component product with documentation service");
          this.selectedProduct = product;
        } else {
          console.log("✗ Product unchanged, no sync needed");
        }
        console.log("================================================================");
      })
    );
    
    this.subscriptions.push(
      this.documentationService.generatedContent$.subscribe(content => {
        this.generatedContent = content;
      })
    );
    
    // Get initial form data from service
    this.sources = this.documentationService.sources;
    this.PdfSources = this.documentationService.pdfSources;
    this.selectedTemplate = this.documentationService.selectedTemplate;
    this.selectedProduct = this.documentationService.selectedProduct || this.onboardingService.getSelectedProduct();
    this.generatedContent = this.documentationService.generatedContent;
    
    // Update generate button state based on initial data
    this.updateGenerateButtonState();
    
    // Fetch templates for the initial product
    this.fetchTemplatesForProduct();
    
    this.userService.setIsUserHasAccountSetup(true);
    this.gettingDocumentationHistoryFromApi();
  }
  
  // Fetch templates based on selected product
  fetchTemplatesForProduct() {
    const selectedProductName = this.onboardingService.getSelectedProduct();
    const productId = this.onboardingService.getSelectedProductId();
    console.log("========== FETCHING TEMPLATES ==========");
    console.log("Selected product name:", selectedProductName);
    console.log("Selected product ID:", productId);
    console.log("========================================");
    
    if (!productId) {
      console.error('No product ID available, skipping template fetch');
      console.error('Product name:', selectedProductName);
      console.error('Full product list:', this.onboardingService.getFullProductList());
      return;
    }
    
    this.subscriptions.push(
      this.apiService.getTemplates(productId).subscribe({
        next: (data: any) => {
          console.log("✓ Templates received for productId:", productId);
          console.log("✓ documentation_types:", data.documentation_types);
          // this.templates = data.documentation_types[0].fields;
          this.templates = data.documentation_types;
          console.log("✓ Templates loaded:", this.templates);
          // this.templates = data.documentation_types;
          this.documentationService.setTemplatesList(data.documentation_types);
        },
        error: (err: any) => {
          console.error('✗ Error fetching templates:', err);
          console.error('✗ ProductId used:', productId);
          // Fallback to empty array or default templates
          this.templates = [];
          this.documentationService.setTemplatesList([]);
        }
      })
    );
  }
  // ngOnDestroy
  ngOnDestroy() {
    // Clean up subscriptions to prevent memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Clear any pending refresh timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }
  // go to documentation generated page
  goToDocumentationGeneratedPage(forceGeneration: boolean = false) {
    this.documentationService.setDocumentationLandingPage(false);
    this.documentationService.setDocumentationGeneratingPage(false);
    this.documentationService.setDocumentationGeneratedPage(true);
    this.documentationGeneratedPage = true;
    this.documentationLandingPage = false;
    this.documentationGeneratingPage = false;
    
    // If forceGeneration is true (Generate button), always generate new documentation
    // If forceGeneration is false (Next button), only generate if user hasn't visited before
    if (forceGeneration || !this.hasVisitedGeneratedPage) {
      this.hasVisitedGeneratedPage = true; // Mark that user has visited the generated page
      
      // Check if either PdfSources or sources arrays have content before proceeding
      if (this.PdfSources.length > 0 || this.sources.length > 0) {
        this.generateDocumentation(this.PdfSources, this.sources); 
      } else {
        console.warn('Cannot generate documentation: No sources or files available');
      }
    }
    // If hasVisitedGeneratedPage is true and forceGeneration is false, just navigate without regenerating
    // The previously generated content will be preserved and displayed
    
  }
  // go to documentation generating page
  goToDocumentationGeneratingPage(){
    this.documentationService.setDocumentationLandingPage(false);
    this.documentationService.setDocumentationGeneratedPage(false);
    this.documentationService.setDocumentationGeneratingPage(true);
    this.documentationGeneratedPage = false;
    this.documentationLandingPage = false;
    this.documentationGeneratingPage = true;
  }
  // go to documentation landing page
  goToDocumentationLandingPage() {
    this.documentationService.setDocumentationGeneratingPage(false);
    this.documentationService.setDocumentationGeneratedPage(false);
    this.documentationService.setDocumentationLandingPage(true);
    this.documentationGeneratedPage = false;
    this.documentationLandingPage = true;
    this.documentationGeneratingPage = false;
    this.hasVisitedGeneratedPage = false; // Reset flag when going back to landing page
  }
  toggleDropdown() {
    this.isOpen = !this.isOpen;
    this.generateTemplateDropdown = !this.generateTemplateDropdown;
    this.isTemplatesDropdownOpen = !this.isTemplatesDropdownOpen
  }
  toggleViewSourcesDropdown() {
    this.isViewSourcesDropdownOpen = !this.isViewSourcesDropdownOpen;
  }
  selectTemplate(template: any) {
    this.documentationService.setSelectedTemplate(template);
    this.documentationService.setSelectedTemplateId(template.id);
    this.isOpen = false;
    this.generateTemplateDropdown = false;
    this.isTemplatesDropdownOpen = false;
  }

  toggleProductDropdown() {
    this.isProductDropdownOpen = !this.isProductDropdownOpen;
    this.isProductDropdownBotOpen = !this.isProductDropdownBotOpen;
    this.isGenProductDropdownOpen = !this.isGenProductDropdownOpen;
  }
  toggleFilterDropdown() {
    this.isFilterDropdownOpen = !this.isFilterDropdownOpen;
  }

  selectProduct(product: string) {
    console.log("========== PRODUCT SELECTED IN DROPDOWN ==========");
    console.log("Product selected:", product);
    
    // Set in onboarding service first to ensure product ID is set
    // This will also trigger the onboarding service subscription which will fetch templates
    this.onboardingService.setSelectedProduct(product);
    
    // Verify the product ID was set correctly
    const verifyProductId = this.onboardingService.getSelectedProductId();
    console.log("Product ID after setting:", verifyProductId);
    
    if (!verifyProductId) {
      console.error("CRITICAL: Product ID is empty after setting product!");
      console.error("Full product list:", this.onboardingService.getFullProductList());
      console.error("Attempting to match product:", product);
    }
    
    // Set in documentation service for consistency (but don't fetch templates from here)
    this.documentationService.setSelectedProduct(product);
    
    // Close dropdowns
    this.isProductDropdownOpen = false;
    this.isGenProductDropdownOpen = false;
    this.isProductDropdownBotOpen = false;
    console.log("==================================================");
  }
  addSource() {
    if (this.newSource.trim()) {
      // Clear PDF sources if URLs are being added
      if (this.PdfSources.length > 0) {
        this.documentationService.clearPdfSources();
      }
      this.documentationService.addSource({ newSource: this.newSource });
      this.newSource = ''; // Clear input after adding
    }
    this.updateGenerateButtonState();
  }

  saveAndCloseModal() {
    // Add any pending source from the input field
    this.addSource();
    // Close the modal
    this.closeModal();
  }

  addPdfSource() {
    console.warn('addPdfSource() is deprecated. Use file upload or sources array for text-based sources.');
  }
  deleteSource(index: number) {
    this.documentationService.removeSource(index);
    this.updateGenerateButtonState();
    // If all sources are deleted, the file upload will be automatically re-enabled
  }

  deletePdfSource(index: number) {
    this.documentationService.removePdfSource(index);
    this.updateGenerateButtonState();
    // If all PDF sources are deleted, the URL input will be automatically re-enabled
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    this.handleFiles(files);
  }
  onDragOver(event: DragEvent) {
    event.preventDefault();
  }
  onDrop(event: DragEvent) {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(files);
    }
  }
  handleFiles(files: FileList) {
    // Clear URL sources if files are being uploaded
    if (this.sources.length > 0) {
      this.documentationService.clearSources();
      this.newSource = ''; // Clear the input field
    }
    for (let i = 0; i < files.length; i++) {
      this.documentationService.addPdfSource(files[i]);
    }
    this.updateGenerateButtonState();
  }
  // open modal
  openModal() {
    this.isModalOpen = true;
  }
  // close modal
  closeModal() {
    this.isModalOpen = false;
  }
  
  // open publish modal
  openPublishModal() {
    this.isPublishModalOpen = true;
  }
  
  // close publish modal
  closePublishModal() {
    this.isPublishModalOpen = false;
    this.publishTitle = '';
    this.publishUrl = '';
    this.selectedDocumentationForPublish = null;
  }
  
  // show custom alert modal
  showAlert(title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', buttonText: string = 'OK', callback: (() => void) | null = null, secondaryButtonText: string = '') {
    this.alertTitle = title;
    this.alertMessage = message;
    this.alertType = type;
    this.alertButtonText = buttonText;
    this.alertButtonSecondaryText = secondaryButtonText;
    this.alertCallback = callback;
    this.isAlertModalOpen = true;
  }
  
  // close custom alert modal
  closeAlert() {
    this.isAlertModalOpen = false;
    if (this.alertCallback) {
      this.alertCallback();
      this.alertCallback = null;
    }
  }
  
  // handle publish form submission
  publishDocumentation() {
    if (!this.publishTitle.trim() || !this.publishUrl.trim()) {
      this.showAlert('Validation Error', 'Please fill in both title and URL fields.', 'warning', 'Got it');
      return;
    }

    let content = '';
    
    // Check if we're publishing from history (selected documentation)
    if (this.selectedDocumentationForPublish && this.selectedDocumentationForPublish.generated_content) {
      content = this.selectedDocumentationForPublish.generated_content;
    } else {
      // Otherwise use the current generated content
      content = this.generatedContentHTML || this.releaseNotes;
    }
    
    if (!content || content.trim() === '') {
      this.showAlert('No Content', 'No documentation content available to publish. Please generate documentation first.', 'warning', 'Understood');
      return;
    }

    // Set loading state
    this.isPublishingDocumentation = true;

    // Convert markdown to HTML for better formatting in Confluence
    const htmlContent = this.convertMarkdownToHTML(content);

    const payload = {
      content: htmlContent,
      page_title: this.publishTitle,
      confluence_url: this.publishUrl
    };
    this.apiService.postWithAuth('publish-to-confluence', payload).subscribe({
      next: (data) => { 
        // Reset loading state
        this.isPublishingDocumentation = false;
        
        // Close modal after successful publish
        this.closePublishModal();
        
        // Reset selected documentation
        this.selectedDocumentationForPublish = null;
        
        // Show success message
        this.showAlert('Success!', 'Documentation published successfully!', 'success', 'OK!');
      },
      error: (error) => {
        console.error("publishDocumentation Error: ", error);
        
        // Reset loading state
        this.isPublishingDocumentation = false;
        
        // Show detailed error message
        let errorMessage = 'Failed to publish documentation. ';
        if (error.error && error.error.message) {
          errorMessage += error.error.message;
        } else if (error.status === 401) {
          errorMessage += 'Authentication failed. Please log in again.';
        } else if (error.status === 403) {
          errorMessage += 'Access denied. Please check your permissions.';
        } else if (error.status === 404) {
          errorMessage += 'Publish endpoint not found. Please contact support.';
        } else if (error.status >= 500) {
          errorMessage += 'Server error. Please try again later.';
        } else {
          errorMessage += 'Please check the URL and try again.';
        }
        
        this.showAlert('Publishing Failed', errorMessage, 'error', 'Try Again');
      }
    });
  }
  
  // Handle publish documentation from history
  onPublishDocumentationFromHistory(documentationItem: any) {
    console.log('Publishing documentation from history:', documentationItem);
    
    // Check if the documentation item has a generated_content field
    if (!documentationItem.generated_content) {
      // If the API doesn't return generated_content in the history, we need to fetch it
      // For now, we'll show a message that we're fetching it
      this.isPublishingDocumentation = true;
      
      // Fetch the documentation content from the API
      this.apiService.getDocumentationContent(documentationItem.id).subscribe({
        next: (data: any) => {
          this.isPublishingDocumentation = false;
          documentationItem.generated_content = data.generated_content || data.content;
          this.selectedDocumentationForPublish = documentationItem;
          
          // Pre-fill the title with the filename (without extension)
          this.publishTitle = documentationItem.pdf_filename?.replace(/\.(pdf|doc|docx)$/i, '') || '';
          this.publishUrl = '';
          
          // Open publish modal
          this.openPublishModal();
        },
        error: (error) => {
          console.error('Error fetching documentation content:', error);
          this.isPublishingDocumentation = false;
          
          // If fetching fails, try to use the PDF URL as a fallback
          // This is a workaround - ideally the API should provide the content
          this.showAlert(
            'Content Unavailable',
            'Unable to fetch the documentation content for publishing. The API may need to be updated to include generated_content in the documentation history response.',
            'warning',
            'OK'
          );
        }
      });
    } else {
      // Content is available, proceed with publishing
      this.selectedDocumentationForPublish = documentationItem;
      
      // Pre-fill the title with the filename (without extension)
      this.publishTitle = documentationItem.pdf_filename?.replace(/\.(pdf|doc|docx)$/i, '') || '';
      this.publishUrl = '';
      
      // Open publish modal
      this.openPublishModal();
    }
  }

  // Handle delete documentation from history
  onDeleteDocumentationFromHistory(documentationItem: any) {
    console.log('Deleting documentation from history:', documentationItem);
    
    // Prevent multiple simultaneous deletions
    if (this.isDeletingDocumentation) {
      console.warn('Delete operation already in progress, ignoring duplicate request');
      return;
    }
    
    // Store the document ID and name in local variables before any async operations
    const documentId = documentationItem?.id;
    const documentName = documentationItem?.pdf_filename || 'this document';
    
    // Check if the document has an ID
    if (!documentId) {
      console.error('Document ID is missing:', documentationItem);
      this.showAlert(
        'Delete Failed',
        'Document ID is missing. Cannot delete this document.',
        'error',
        'OK'
      );
      return;
    }

    // Check if document still exists in the list (might have been deleted already)
    const documentExists = this.releaseHistory.some(item => item?.id === documentId);
    if (!documentExists) {
      console.warn('Document already removed from list, ID:', documentId);
      // Refresh the list to ensure consistency
      this.gettingDocumentationHistoryFromApi();
      return;
    }

    // Show custom confirmation modal
    this.showDeleteConfirmation(documentName, documentId);
  }

  // Show delete confirmation modal
  showDeleteConfirmation(documentName: string, documentId: string) {
    this.deleteConfirmDocumentName = documentName;
    this.deleteConfirmDocumentId = documentId;
    this.deleteConfirmCallback = () => this.executeDelete(documentId, documentName);
    this.isDeleteConfirmModalOpen = true;
  }

  // Close delete confirmation modal (Cancel button)
  closeDeleteConfirmModal() {
    this.isDeleteConfirmModalOpen = false;
    this.deleteConfirmDocumentName = '';
    this.deleteConfirmDocumentId = '';
    this.deleteConfirmCallback = null;
  }

  // Confirm delete (OK button) - behaves like confirm() returning true
  confirmDelete() {
    if (this.deleteConfirmCallback && this.deleteConfirmDocumentId) {
      this.deleteConfirmCallback();
    }
  }

  // Execute the actual delete operation
  executeDelete(documentId: string, documentName: string) {
    // Close the delete confirmation modal first
    this.closeDeleteConfirmModal();
    
    // Set deleting flag
    this.isDeletingDocumentation = true;
    
    // Cancel any pending refresh timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }

    // Call the delete API method
    const deleteSubscription = this.apiService.deleteSingleGeneratedDocument(documentId).subscribe({
      next: () => {
        console.log('Document deleted successfully, ID:', documentId);
        
        // Immediately remove the document from the local arrays for instant UI update
        // Use the stored documentId to ensure we're filtering correctly
        this.releaseHistory = this.releaseHistory.filter(item => item?.id !== documentId);
        
        // Apply search filter using the existing method to ensure consistency
        this.onSearchChange();
        
        // Reset deleting flag
        this.isDeletingDocumentation = false;
        
        // Show success message
        this.showAlert(
          'Document Deleted',
          `"${documentName}" has been deleted successfully.`,
          'success',
          'OK'
        );
        
        // Refresh data from API after a short delay to ensure consistency
        // This ensures the server has processed the deletion
        this.refreshTimeout = setTimeout(() => {
          this.gettingDocumentationHistoryFromApi();
          this.refreshTimeout = null;
        }, 1000);
      },
      error: (error) => {
        console.error('Error deleting documentation:', error);
        console.error('Failed to delete document ID:', documentId);
        
        // Reset deleting flag on error
        this.isDeletingDocumentation = false;
        
        // Show error message
        const errorMessage = error?.error?.message || error?.message || 'An unknown error occurred while deleting the document.';
        this.showAlert(
          'Delete Failed',
          errorMessage,
          'error',
          'OK'
        );
      }
    });
    
    // Store subscription for cleanup if needed
    this.subscriptions.push(deleteSubscription);
  }

  // create document
  createDocument() {
    // Check if either PdfSources or sources arrays have content before proceeding
    if (this.PdfSources.length > 0 || this.sources.length > 0) {
      this.generateDocumentation(this.PdfSources, this.sources); 
    } else {
      console.warn('Cannot generate documentation: No sources or files available');
    }
  }

  // Update generate button state based on available sources or files
  updateGenerateButtonState() {
    this.generateDoc = this.PdfSources.length > 0 || this.sources.length > 0;
  }

  // documentation ask documentaion bot
  documentationAskDocuBot(){
    this.router.navigate(['/dashboard-page/chat']);
  }
  // On Clicking Outside the dropdown
  @ViewChild('dropdown') dropdownRef!: ElementRef;
  @ViewChild('templatesDropdown') templatesDropdownRef!: ElementRef;
  @ViewChild('botProductDropdown') botProductDropdownRef!: ElementRef;
  @ViewChild('genTemplateDropdown') genTemplateDropdownRef!: ElementRef;
  @ViewChild('genProductDropdown') genProductDropdownRef!: ElementRef;
  @ViewChild('viewSourcesDropdown') viewSourcesDropdownRef!: ElementRef;
  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement): void {
    // Product
    if (this.dropdownRef && !this.dropdownRef.nativeElement.contains(targetElement)) {
      this.isProductDropdownOpen = false;
    }
    if (this.botProductDropdownRef && !this.botProductDropdownRef.nativeElement.contains(targetElement)) {
      this.isProductDropdownBotOpen = false;
    }
    if (this.genProductDropdownRef && !this.genProductDropdownRef.nativeElement.contains(targetElement)) {
      this.isGenProductDropdownOpen = false;
    }

     // Template
    if (this.templatesDropdownRef && !this.templatesDropdownRef.nativeElement.contains(targetElement)) {
      this.isTemplatesDropdownOpen = false;
    }
    if (this.genTemplateDropdownRef && !this.genTemplateDropdownRef.nativeElement.contains(targetElement)) {
      this.generateTemplateDropdown = false;
    }
    // Sources
    if (this.viewSourcesDropdownRef && !this.viewSourcesDropdownRef.nativeElement.contains(targetElement)) {
      this.isViewSourcesDropdownOpen = false;
    }
  }
  // Generate Documentation from API
  generateDocumentation(files: File[], sources: { newSource: string }[]) {
    this.isGeneratingDocumentation = true;
    this.documentationService.setGeneratedContent('');
    
    // Reset PDF URL state when starting new generation
    this.pdfUrl = '';
    this.isPdfUrlValid = false;
    this.pdfUrlError = '';
  
    const today = new Date();
    const releaseDate = today.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  
    const sourceStrings = sources.map(s => s.newSource);
    console.log("generatedFileName in generateDocumentation", this.documentationName);
    const formData = new FormData();
    formData.append("created_by", this.userName);
    formData.append("release_date", releaseDate);
    formData.append("product_type", this.onboardingService.getSelectedProductId());
    formData.append("template_type", this.documentationService.selectedTemplateId);
    formData.append("data_sources", JSON.stringify(sourceStrings));
    formData.append("pdf_file_name", this.documentationName || 'Untitled Documentation');
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
  
    this.apiService.generateDocumentation(formData).subscribe({
      next: (data: any) => {
        console.log("data in generateDocumentation", data);
        this.documentationService.setGeneratedContent(data.generated_content);
        
        // Validate and set PDF URL with error handling
        if (data.pdf_url) {
          const urlValidation = this.validatePdfUrl(data.pdf_url);
          if (urlValidation.isValid) {
            this.pdfUrl = data.pdf_url;
            this.isPdfUrlValid = true;
            this.pdfUrlError = '';
            console.log("PDF URL validated successfully:", this.pdfUrl);
          } else {
            this.pdfUrl = '';
            this.isPdfUrlValid = false;
            this.pdfUrlError = urlValidation.error || 'Invalid PDF URL format';
            console.error("PDF URL validation failed:", this.pdfUrlError);
            this.showAlert(
              'PDF URL Error',
              'The generated PDF URL is invalid or malformed. Please contact support if this issue persists.',
              'warning',
              'OK'
            );
          }
        } else {
          this.pdfUrl = '';
          this.isPdfUrlValid = false;
          this.pdfUrlError = 'PDF URL not provided by the server';
          console.warn("PDF URL missing from API response");
          this.showAlert(
            'PDF URL Missing',
            'The documentation was generated successfully, but the PDF download link is not available. Please try generating again or contact support.',
            'warning',
            'OK'
          );
        }
        
        this.generatedFileName = data.pdf_filename;
        this.releaseNotes = data.generated_content;
        this.isGeneratingDocumentation = false;
      },
      error: (err: any) => {
        console.error("API Error Details:", err);
        this.isGeneratingDocumentation = false;
        this.pdfUrl = '';
        this.isPdfUrlValid = false;
        this.pdfUrlError = 'Failed to generate documentation';
        
        // Show error alert
        let errorMessage = 'Failed to generate documentation. ';
        if (err.error && err.error.message) {
          errorMessage += err.error.message;
        } else if (err.status === 0) {
          errorMessage += 'Network error. Please check your connection.';
        } else if (err.status >= 500) {
          errorMessage += 'Server error. Please try again later.';
        } else {
          errorMessage += 'Please try again.';
        }
        
        this.showAlert('Generation Failed', errorMessage, 'error', 'OK');
      },
    });
  }
 
  // Parse markdown content for PDF formatting
  private parseMarkdownForPDF(content: string): any[] {
    if (!content || typeof content !== 'string') {
      console.warn('Invalid content provided to parseMarkdownForPDF');
      return [];
    }

    const elements: any[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        elements.push({ type: 'spacing', height: 4 });
        continue;
      }
      
      try {
        // Headers - with updated height calculations matching new font sizes
        if (line.startsWith('# ')) {
          const text = line.substring(2).trim();
          if (text) {
            const cleanText = this.removeBoldMarkers(text);
            const wrappedLines = this.wrapText(cleanText, 150, 20); // H1: 20pt font
            elements.push({ type: 'h1', text: cleanText, lines: wrappedLines, height: wrappedLines.length * 8 + 8 });
          }
        } else if (line.startsWith('## ')) {
          const text = line.substring(3).trim();
          if (text) {
            const cleanText = this.removeBoldMarkers(text);
            const wrappedLines = this.wrapText(cleanText, 150, 16); // H2: 16pt font
            elements.push({ type: 'h2', text: cleanText, lines: wrappedLines, height: wrappedLines.length * 7 + 6 });
          }
        } else if (line.startsWith('### ')) {
          const text = line.substring(4).trim();
          if (text) {
            const cleanText = this.removeBoldMarkers(text);
            const wrappedLines = this.wrapText(cleanText, 150, 14); // H3: 14pt font
            elements.push({ type: 'h3', text: cleanText, lines: wrappedLines, height: wrappedLines.length * 6 + 4 });
          }
        } else if (line.startsWith('#### ')) {
          const text = line.substring(5).trim();
          if (text) {
            const cleanText = this.removeBoldMarkers(text);
            const wrappedLines = this.wrapText(cleanText, 150, 12); // H4: 12pt font
            elements.push({ type: 'h4', text: cleanText, lines: wrappedLines, height: wrappedLines.length * 6 + 4 });
          }
        }
        // Lists - with updated spacing
        else if (line.startsWith('- ') || line.startsWith('* ')) {
          const text = line.substring(2).trim();
          if (text) {
            const cleanText = this.removeBoldMarkers(text);
            const wrappedLines = this.wrapText(`• ${cleanText}`, 145, 11); // 11pt font for lists
            elements.push({ type: 'bullet_list', text: cleanText, lines: wrappedLines, height: wrappedLines.length * 6 + 2 });
          }
        } else if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^(\d+)\.\s(.+)$/);
          if (match) {
            const number = match[1];
            const text = match[2].trim();
            const cleanText = this.removeBoldMarkers(text);
            const wrappedLines = this.wrapText(`${number}. ${cleanText}`, 145, 11); // 11pt font for lists
            elements.push({ type: 'numbered_list', text: cleanText, lines: wrappedLines, height: wrappedLines.length * 6 + 2 });
          }
        }
        // Tables (basic support)
        else if (line.includes('|')) {
          const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
          if (cells.length > 1) {
            const cleanCells = cells.map(cell => this.removeBoldMarkers(cell));
            const tableLine = cleanCells.join(' | ');
            const wrappedLines = this.wrapText(tableLine, 150, 11);
            elements.push({ type: 'table', text: tableLine, lines: wrappedLines, height: wrappedLines.length * 6 + 3 });
          }
        }
        // Regular text
        else {
          // Check if line contains bold text
          if (line.includes('**')) {
            const boldElements = this.parseBoldText(line);
            elements.push(...boldElements);
          } else {
            const cleanText = this.removeBoldMarkers(line);
            const wrappedLines = this.wrapText(cleanText, 150, 11); // 11pt font for body text
            elements.push({ type: 'text', text: cleanText, lines: wrappedLines, height: wrappedLines.length * 6 + 3 });
          }
        }
      } catch (error) {
        console.error('Error parsing line:', line, error);
        // Fallback to regular text
        const cleanText = this.removeBoldMarkers(line);
        const wrappedLines = this.wrapText(cleanText, 150, 11);
        elements.push({ type: 'text', text: cleanText, lines: wrappedLines, height: wrappedLines.length * 6 + 3 });
      }
    }
    
    return elements;
  }

  // Remove bold markers from text
  private removeBoldMarkers(text: string): string {
    if (!text || typeof text !== 'string') {
      return text;
    }
    return text.replace(/\*\*(.*?)\*\*/g, '$1');
  }

  // Parse bold text and return formatted elements
  private parseBoldText(line: string): any[] {
    const elements: any[] = [];
    const parts = line.split(/(\*\*.*?\*\*)/g);
    
    for (const part of parts) {
      if (!part) continue;
      
      if (part.startsWith('**') && part.endsWith('**')) {
        // Bold text - remove ** markers
        const boldText = part.slice(2, -2);
        if (boldText.trim()) {
          const wrappedLines = this.wrapText(boldText, 150, 11);
          elements.push({ 
            type: 'bold', 
            text: boldText, 
            lines: wrappedLines, 
            height: wrappedLines.length * 6 + 3 
          });
        }
      } else if (part.trim()) {
        // Regular text
        const wrappedLines = this.wrapText(part, 150, 11);
        elements.push({ 
          type: 'text', 
          text: part, 
          lines: wrappedLines, 
          height: wrappedLines.length * 6 + 3 
        });
      }
    }
    
    return elements;
  }

  // Helper method to wrap text - with font size awareness for better wrapping
  private wrapText(text: string, maxWidth: number, fontSize: number = 11): string[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    // Calculate approximate characters per line based on font size and page width
    // Average character width is approximately fontSize * 0.5 mm in Helvetica
    const charWidth = fontSize * 0.5;
    const maxChars = Math.floor(maxWidth / charWidth);
    
    for (const word of words) {
      if (!word) continue; // Skip empty words
      
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      if (testLine.length <= maxChars) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines.length > 0 ? lines : [text];
  }
  // getting product list from api
  gettingProductListFromApi() {
    this.apiService.get<any>('list_products').subscribe({
      next: async (data) => {
        console.log('Products loaded from API:', data);
        this.products = data.map((product: any) => product.name);
        console.log('Product names:', this.products);
        console.log('Product IDs:', data.map((product: any) => ({ name: product.name, id: product.id })));
        // Also set the full product list with IDs so that getSelectedProductId() works
        this.onboardingService.setFullProductList(data);
      },
      error: (err) => {
        console.error('Error loading products from API:', err);
      }
    });
  }
  // getting documentation history from api
  gettingDocumentationHistoryFromApi() {
    // Don't refresh if a deletion is in progress to avoid race conditions
    if (this.isDeletingDocumentation) {
      console.log('Skipping API refresh - deletion in progress');
      return;
    }
    
    this.apiService.getDocumentationHistory().subscribe({
      next: async (data: any) => {
        // Double-check deletion isn't in progress before updating
        if (this.isDeletingDocumentation) {
          console.log('Skipping API refresh update - deletion in progress');
          return;
        }
        
        this.releaseHistory = Array.isArray(data) ? data : [];
        console.log("releaseHistory in gettingDocumentationHistoryFromApi", this.releaseHistory);
        // Apply search filter if search term exists
        if (this.searchTerm.trim()) {
          this.onSearchChange();
        } else {
          this.filteredReleaseHistory = [...this.releaseHistory];
        }
      },  
      error: (err) => {
        console.error('Error fetching documentation history:', err);
        // Only update on error if deletion is not in progress
        if (!this.isDeletingDocumentation) {
          this.releaseHistory = [];
          this.filteredReleaseHistory = [];
        }
      },
    });
  }

  // Search functionality
  onSearchChange() {
    if (!this.searchTerm.trim()) {
      this.filteredReleaseHistory = [...this.releaseHistory];
    } else {
      this.filteredReleaseHistory = this.releaseHistory.filter(item => {
        const searchLower = this.searchTerm.toLowerCase();
        return (
          item.pdf_filename?.toLowerCase().includes(searchLower) ||
          item.product_type?.toLowerCase().includes(searchLower) ||
          item.template_type?.toLowerCase().includes(searchLower) ||
          item.created_by?.toLowerCase().includes(searchLower) ||
          item.release_date?.toString().toLowerCase().includes(searchLower)
        );
      });
    }
  }

  // Resolve icon path based on file extension
  getFileIcon(fileName: string): string {
    if (!fileName) {
      return 'assets/icons/doc-icon.png';
    }
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'assets/icons/pdf-icon.svg';
      case 'doc':
        return 'assets/icons/doc-icon.svg';
      case 'docx':
        return 'assets/icons/docx-icon.svg';
      default:
        return 'assets/icons/doc-icon.svg';
    }
  }

  // Getter for HTML version of generated content
  get generatedContentHTML(): string {
    if (!this.generatedContent) {
      return '';
    }
    return this.convertMarkdownToHTML(this.generatedContent);
  }

  // Getter for HTML version of selected documentation content
  get selectedDocumentationHTML(): string {
    const content = this.selectedDocumentationForPublish?.generated_content || this.generatedContent || this.releaseNotes || '';
    if (!content) {
      return 'No content available';
    }
    return this.convertMarkdownToHTML(content);
  }

  // Convert markdown to HTML for publishing
  private convertMarkdownToHTML(markdown: string): string {
    if (!markdown || typeof markdown !== 'string') {
      return '';
    }

    let html = markdown;

    // Remove markdown code block markers (```markdown, ```, etc.)
    html = html.replace(/```markdown\s*/gim, '');
    html = html.replace(/```\s*/gim, '');
    html = html.replace(/\s*```/gim, '');

    // Clean up excessive newlines first (reduce multiple newlines to double newlines)
    html = html.replace(/\n{3,}/g, '\n\n');

    // Convert headers
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Convert bold text
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\_\_(.*?)\_\_/g, '<strong>$1</strong>');

    // Convert italic text
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\_(.*?)\_/g, '<em>$1</em>');

    // Convert unordered lists
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');

    // Convert ordered lists
    html = html.replace(/^\d+\.\s+(.*$)/gim, '<li>$1</li>');

    // Wrap consecutive <li> elements with <ul> or <ol>
    html = this.wrapListItems(html);

    // Convert double line breaks to paragraph breaks only (not single line breaks)
    html = html.replace(/\n\n+/g, '</p><p>');
    
    // Remove single newlines that are not already part of HTML tags
    html = html.replace(/([^>])\n([^<])/g, '$1 $2');

    // Wrap in paragraph tags if not already wrapped
    if (!html.startsWith('<h') && !html.startsWith('<p') && !html.startsWith('<ul') && !html.startsWith('<ol')) {
      html = '<p>' + html + '</p>';
    }

    // Clean up extra paragraph tags and breaks around block elements
    html = html.replace(/<p><h/g, '<h');
    html = html.replace(/<\/h([1-6])><\/p>/g, '</h$1>');
    html = html.replace(/<p><ul>/g, '<ul>');
    html = html.replace(/<\/ul><\/p>/g, '</ul>');
    html = html.replace(/<p><ol>/g, '<ol>');
    html = html.replace(/<\/ol><\/p>/g, '</ol>');
    
    // Remove empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p><\/p>/g, '');

    return html;
  }

  // Validate PDF URL format and accessibility
  private validatePdfUrl(url: string): { isValid: boolean; error?: string } {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return { isValid: false, error: 'PDF URL is empty or invalid' };
    }

    // Basic URL format validation
    try {
      const urlObj = new URL(url);
      
      // Check if it's a valid HTTP/HTTPS URL
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { isValid: false, error: 'PDF URL must use HTTP or HTTPS protocol' };
      }
      
      // Check if URL has a valid hostname
      if (!urlObj.hostname || urlObj.hostname.trim() === '') {
        return { isValid: false, error: 'PDF URL has an invalid hostname' };
      }
      
      return { isValid: true };
    } catch (error) {
      // URL constructor throws error for invalid URLs
      return { isValid: false, error: 'PDF URL format is invalid' };
    }
  }

  // Handle PDF download with error checking
  handlePdfDownload(event: Event): void {
    if (!this.isPdfUrlValid || !this.pdfUrl) {
      event.preventDefault();
      event.stopPropagation();
      
      if (this.pdfUrlError) {
        this.showAlert(
          'Download Error',
          this.pdfUrlError + '. Please try generating the documentation again.',
          'error',
          'OK'
        );
      } else {
        this.showAlert(
          'Download Unavailable',
          'PDF download link is not available. Please generate the documentation first.',
          'warning',
          'OK'
        );
      }
      return;
    }

    // Optional: Test if the URL is accessible before allowing download
    // This is a lightweight check - the actual download will still happen
    const urlValidation = this.validatePdfUrl(this.pdfUrl);
    if (!urlValidation.isValid) {
      event.preventDefault();
      event.stopPropagation();
      this.showAlert(
        'Invalid PDF URL',
        urlValidation.error || 'The PDF URL is invalid. Please contact support.',
        'error',
        'OK'
      );
    }
  }

  // Helper method to wrap list items with ul/ol tags
  private wrapListItems(html: string): string {
    const lines = html.split('\n');
    const result: string[] = [];
    let inList = false;
    let listType = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.trim().startsWith('<li>')) {
        if (!inList) {
          // Start a new list
          // Check if it's from a numbered list (if previous line had number pattern)
          const previousLine = i > 0 ? lines[i - 1] : '';
          listType = /^\d+\./.test(previousLine.trim()) ? 'ol' : 'ul';
          result.push(`<${listType}>`);
          inList = true;
        }
        result.push(line);
      } else {
        if (inList) {
          // Close the list
          result.push(`</${listType}>`);
          inList = false;
        }
        result.push(line);
      }
    }

    // Close list if still open at the end
    if (inList) {
      result.push(`</${listType}>`);
    }

    return result.join('\n');
  }

  // Check if documentation is ready to be published
  get isDocumentationReady(): boolean {
    // Documentation is ready if:
    // 1. Not currently generating
    // 2. Has generated content (either generatedContent or releaseNotes)
    return !this.isGeneratingDocumentation && 
           (!!this.generatedContent || !!this.releaseNotes);
  }
}
