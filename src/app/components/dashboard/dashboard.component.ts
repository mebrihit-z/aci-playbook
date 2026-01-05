import { Component,  ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { SummaryCardComponent } from '../../components/cards/summary-card/summary-card.component';
import { ReleaseHistoryTableComponent } from '../../components/tables/release-history-table/release-history-table.component';
import { UserService } from '../../services/user.service';
import { ApiService } from '../../services/api.service';
import { OnboardingService } from '../../services/onboarding.service';
import { TooltipService } from '../../services/tooltip.service';
import { DocumentationService } from '../../services/documentation.service';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SummaryCardComponent, ReleaseHistoryTableComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {

  listNumber = 2;
  userName: string | null = 'User Name';
  userRole: string | null = 'Product Owner';
  isUserHasAccountSetup: boolean | null = null;
  isOnboardingCompleted: boolean = false;

  // documentation Pages
  documentationLandingPage = false;
  documentationGeneratingPage = false; 
  documentationGeneratedPage = false; 

  selectedProduct: string = "";
  products: string[] = [];
  personaWidgetList: string[] = [];
  selectedWidgetList: string[] = [];
  selectedCustomizeWidgets: string[] = [];
  releaseHistory: any[] = [];
  filteredReleaseHistory: any[] = [];
  searchTerm: string = '';
  isProductDropdownOpen = false;
  
  // Publish modal properties
  isPublishModalOpen: boolean = false;
  isPublishingDocumentation: boolean = false;
  publishTitle: string = '';
  publishUrl: string = '';
  selectedDocumentationForPublish: any = null;
  
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
  isDeletingDocumentation: boolean = false;
  // tooltip
  skipTooltipValue = false;
  aciPaymentHubTooltip = false;
  createDocTooltip = false;
  startNewChatTooltip = false;
 
  dashboardModelDone = false;
  aciPaymentHubTooltipDone = false;
  createDocTooltipDone = false;
  startNewChatTooltipDone = false;
  // Customize Widgets
  isCustomizeWidgets = false;

  // constructor
  constructor(private userService: UserService, 
    private tooltipService: TooltipService,  
    private documentationService: DocumentationService, 
    private router: Router, 
    private onboardingService: OnboardingService,
    private apiService: ApiService
  ) {}
  // ngOnInit
  ngOnInit() {
    this.userService.userName$.subscribe(name => {
      this.userName = name;
    });
    this.userService.userRole$.subscribe(role => {
      this.userRole = role;
    });
    this.userService.isUserHasAccountSetup$.subscribe(isSetup => {
      this.isUserHasAccountSetup = isSetup;
    });

    // Check if user just completed onboarding
    this.isOnboardingCompleted = this.onboardingService.getOnboardingCompleted();

    // Get products
    if(this.onboardingService.getProductList().length > 0) {
        this.products = this.onboardingService.getProductList();
        this.selectedProduct = this.onboardingService.getSelectedProduct();
    } else {
        this.gettingProductListFromApi();
    }
    
    // Subscribe to selected product changes reactively
    this.onboardingService.getSelectedProduct$().subscribe(product => {
      this.selectedProduct = product;
    });
    // Subscribe to persona widget list changes reactively
    this.onboardingService.getPersonaWidgetList$().subscribe(widgetList => {
      this.personaWidgetList = widgetList;
    });
    
    // Subscribe to widget list changes reactively
    this.onboardingService.getSelectedWidgetList$().subscribe(widgetList => {
      this.selectedWidgetList = widgetList;
    });
    
    // Initial load
    this.selectedWidgetList = this.onboardingService.getSelectedWidgetList();
    
    this.documentationLandingPage = this.documentationService.getDocumentationLandingPage();
    this.documentationGeneratingPage = this.documentationService.getDocumentationGeneratingPage(); 
    this.documentationGeneratedPage = this.documentationService.getDocumentationGeneratedPage();
    // getting documentation history from api
    this.gettingDocumentationHistoryFromApi();
  }
  
  toggleProductDropdown() {
    this.isProductDropdownOpen = !this.isProductDropdownOpen;
  }
  selectProduct(product: string) {
    this.selectedProduct = product;
    this.isProductDropdownOpen = false;
  }
  // tooltip
  skipTooltip(){
    this.skipTooltipValue = true;
    this.tooltipService.setSkipTooltipValue(true);
    // Clear onboarding completion flag after skipping tooltip
    this.onboardingService.setOnboardingCompleted(false);
  }
  goToAciPaymentHubTooltip(){
    this.aciPaymentHubTooltip = true;
    this.dashboardModelDone = true;
    // Clear onboarding completion flag after showing tooltip
    this.onboardingService.setOnboardingCompleted(false);
  }
  skipAciPaymentHubTooltip(){
    this.aciPaymentHubTooltipDone = true;
  }
  goToCreateDocTooltip(){
    this.createDocTooltip = true;
    this.aciPaymentHubTooltipDone = true;
  }
  skipCreateDocTooltip(){
    this.createDocTooltipDone = true;
  }
  goToStartNewChatTooltip(){
    this.startNewChatTooltip = true;
    this.createDocTooltipDone = true;
  }
  doneWithTooltip(){
    this.startNewChatTooltipDone = true;
  }
  // Customize Widgets
  customizeWidgets(){
    this.isCustomizeWidgets = true;
  }
  closeCustomizeWidgets(){
    this.isCustomizeWidgets = false;
  }
  toggleCustomizeWidgets(value: string) {
    const index = this.selectedCustomizeWidgets.indexOf(value);
    if (index === -1) {
      this.selectedCustomizeWidgets.push(value);
    } else {
      this.selectedCustomizeWidgets.splice(index, 1);
    }
  }
  saveCustomizeWidgets(){
    this.selectedWidgetList = this.selectedCustomizeWidgets
    this.isCustomizeWidgets = false;
  }
  restoreTodefault(){
    this.selectedWidgetList = this.onboardingService.getSelectedWidgetList();
    this.isCustomizeWidgets = false;
    this.selectedCustomizeWidgets = [];
  }
  // Documentation
  goToDocumentationGeneratingPage(){
    // Set flag to clear fields when navigating to generating page
    this.documentationService.setShouldClearFieldsOnNavigate(true);
    
    this.documentationService.setDocumentationLandingPage(false);
    this.documentationService.setDocumentationGeneratingPage(true); 
    this.documentationService.setDocumentationGeneratedPage(false); 
    
    this.router.navigate(['/dashboard-page/documentation']);
  }
  dashboardStartNewChat(){
    this.router.navigate(['/dashboard-page/chat']);
  }
 
  // On Click Outside
  @ViewChild('dropdown') dropdownRef!: ElementRef;
  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    if (this.dropdownRef && !this.dropdownRef.nativeElement.contains(targetElement)) {
      this.isProductDropdownOpen = false;
    }
  }
  // getting product list from api
  gettingProductListFromApi() {
    this.apiService.get<any>('list_products').subscribe({
      next: async (data) => {
        this.products = data.map((product: any) => product.name);
      },
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
        this.filteredReleaseHistory = [...this.releaseHistory];
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
  
  // Publish functionality
  onPublishDocumentationFromHistory(documentationItem: any) {
    console.log('Publishing documentation from history:', documentationItem);
    
    // Check if the documentation item has a generated_content field
    if (!documentationItem.generated_content) {
      // If the API doesn't return generated_content in the history, we need to fetch it
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
          
          // If fetching fails, show a warning
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

  // Delete functionality
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
      this.showAlert(
        'Delete Failed',
        'Document ID is missing. Cannot delete this documentation.',
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
    
    // Set deleting flag to prevent multiple simultaneous deletions
    this.isDeletingDocumentation = true;

    // Call the API to delete the documentation
    this.apiService.deleteSingleGeneratedDocument(documentId).subscribe({
      next: (data: any) => {
        console.log('Document deleted successfully, ID:', documentId);
        
        // Remove the deleted item from both arrays
        this.releaseHistory = this.releaseHistory.filter(item => item.id !== documentId);
        this.filteredReleaseHistory = this.filteredReleaseHistory.filter(item => item.id !== documentId);
        
        // Reset deleting flag
        this.isDeletingDocumentation = false;
        
        // Show success message
        this.showAlert(
          'Document Deleted',
          `"${documentName}" has been deleted successfully.`,
          'success',
          'OK'
        );
      },
      error: (error) => {
        console.error('Error deleting documentation:', error);
        console.error('Failed to delete document ID:', documentId);
        
        // Reset deleting flag on error
        this.isDeletingDocumentation = false;
        
        // Show detailed error message
        let errorMessage = 'Failed to delete documentation. ';
        if (error.error && error.error.message) {
          errorMessage += error.error.message;
        } else if (error.status === 404) {
          errorMessage += 'Documentation not found.';
        } else if (error.status === 403) {
          errorMessage += 'You do not have permission to delete this documentation.';
        } else if (error.status >= 500) {
          errorMessage += 'Server error. Please try again later.';
        } else {
          errorMessage += 'Please try again.';
        }
        
        this.showAlert(
          'Delete Failed',
          errorMessage,
          'error',
          'OK'
        );
      }
    });
  }
  
  // Open publish modal
  openPublishModal() {
    this.isPublishModalOpen = true;
  }
  
  // Close publish modal
  closePublishModal() {
    this.isPublishModalOpen = false;
    this.publishTitle = '';
    this.publishUrl = '';
    this.selectedDocumentationForPublish = null;
  }

  // Getter for HTML version of selected documentation content
  get selectedDocumentationHTML(): string {
    const content = this.selectedDocumentationForPublish?.generated_content || '';
    if (!content) {
      return 'No content available';
    }
    return this.convertMarkdownToHTML(content);
  }
  
  // Show custom alert modal
  showAlert(title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', buttonText: string = 'OK', callback: (() => void) | null = null, secondaryButtonText: string = '') {
    this.alertTitle = title;
    this.alertMessage = message;
    this.alertType = type;
    this.alertButtonText = buttonText;
    this.alertButtonSecondaryText = secondaryButtonText;
    this.alertCallback = callback;
    this.isAlertModalOpen = true;
  }
  
  // Close custom alert modal
  closeAlert() {
    this.isAlertModalOpen = false;
    if (this.alertCallback) {
      this.alertCallback();
      this.alertCallback = null;
    }
  }
  
  // Handle publish form submission
  publishDocumentation() {
    if (!this.publishTitle.trim() || !this.publishUrl.trim()) {
      this.showAlert('Validation Error', 'Please fill in both title and URL fields.', 'warning', 'Got it');
      return;
    }

    let content = '';
    
    // Check if we're publishing from history (selected documentation)
    if (this.selectedDocumentationForPublish && this.selectedDocumentationForPublish.generated_content) {
      content = this.selectedDocumentationForPublish.generated_content;
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
}
