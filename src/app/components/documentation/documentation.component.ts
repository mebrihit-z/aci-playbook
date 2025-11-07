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
  releaseNotes: string = '';
  generatedFileName: string = '';
  
  // Publish modal form data
  publishTitle: string = '';
  publishUrl: string = '';
  
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
    } else {
        this.gettingProductListFromApi();
    }
    
    // Subscribe to selected product changes from onboarding service (for user settings)
    this.subscriptions.push(
      this.onboardingService.getSelectedProduct$().subscribe(product => {
        if (product && product !== this.selectedProduct) {
          this.selectedProduct = product;
          // Also update the documentation service to keep them in sync
          this.documentationService.setSelectedProduct(product);
        }
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
    
    this.subscriptions.push(
      this.documentationService.selectedProduct$.subscribe(product => {
        this.selectedProduct = product;
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
    
    // Subscribe to get templates from API
    this.subscriptions.push(
      this.apiService.getTemplates().subscribe({
        next: (data: any) => {
          this.templates = data.documentation_types;
          this.documentationService.setTemplatesList(data.documentation_types);
        },
        error: (err: any) => {
          console.error('Error fetching templates:', err);
          // Fallback to empty array or default templates
          this.templates = [];
          this.documentationService.setTemplatesList([]);
        }
      })
    );
    
    this.userService.setIsUserHasAccountSetup(true);
    this.gettingDocumentationHistoryFromApi();
  }
  // ngOnDestroy
  ngOnDestroy() {
    // Clean up subscriptions to prevent memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  // go to documentation generated page
  goToDocumentationGeneratedPage() {
    this.documentationService.setDocumentationLandingPage(false);
    this.documentationService.setDocumentationGeneratingPage(false);
    this.documentationService.setDocumentationGeneratedPage(true);
    this.documentationGeneratedPage = true;
    this.documentationLandingPage = false;
    this.documentationGeneratingPage = false;
    
    // Check if either PdfSources or sources arrays have content before proceeding
    if (this.PdfSources.length > 0 || this.sources.length > 0) {
      this.generateDocumentation(this.PdfSources, this.sources); 
    } else {
      console.warn('Cannot generate documentation: No sources or files available');
    }
    
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
    this.documentationService.setSelectedProduct(product);
    // Also set the selected product in onboarding service to ensure product ID is set
    this.onboardingService.setSelectedProduct(product);
    this.isProductDropdownOpen = false;
    this.isGenProductDropdownOpen = false;
    this.isProductDropdownBotOpen = false;
  }
  addSource() {
    if (this.newSource.trim()) {
      this.documentationService.addSource({ newSource: this.newSource });
      this.newSource = ''; // Clear input after adding
    }
    this.updateGenerateButtonState();
  }

  addPdfSource() {
    console.warn('addPdfSource() is deprecated. Use file upload or sources array for text-based sources.');
  }
  deleteSource(index: number) {
    this.documentationService.removeSource(index);
    this.updateGenerateButtonState();
  }

  deletePdfSource(index: number) {
    this.documentationService.removePdfSource(index);
    this.updateGenerateButtonState();
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

    const content = this.generatedContent || this.releaseNotes;
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
  
    const today = new Date();
    const releaseDate = today.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  
    const sourceStrings = sources.map(s => s.newSource);
  
    const formData = new FormData();
    formData.append("created_by", this.userName);
    formData.append("release_date", releaseDate);
    formData.append("product_type", this.onboardingService.getSelectedProductId());
    formData.append("template_type", this.documentationService.selectedTemplateId);
    formData.append("data_sources", JSON.stringify(sourceStrings));
    formData.append("documentation_name", this.documentationName || 'Untitled Documentation');
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
  
    this.apiService.generateDocumentation(formData).subscribe({
      next: (data: any) => {
        this.documentationService.setGeneratedContent(data.generated_content);
        this.generatedFileName = data.pdf_filename;
        this.releaseNotes = data.generated_content;
        this.isGeneratingDocumentation = false;
      },
      error: (err: any) => {
        console.error("API Error Details:", err);
        this.isGeneratingDocumentation = false;
      },
    });
  }
  // export as text
  exportAsText() {
    try {
      // Check if we have content to export
      if (!this.releaseNotes || this.releaseNotes.trim() === '') {
        console.warn('No content to export');
        this.showAlert('No Content', 'No content available to export. Please generate documentation first.', 'warning', 'Understood');
        return;
      }

    const doc = new jsPDF();
      const pageWidth = 190; // Page width in mm
      const pageHeight = 280; // Page height in mm
      const margin = 20; // Increased margin for cleaner look
      let yPosition = margin;
      
      // Parse and format the markdown content
      const formattedContent = this.parseMarkdownForPDF(this.releaseNotes);
      
      // Add content with proper formatting
      for (const element of formattedContent) {
        // Skip spacing elements
        if (element.type === 'spacing') {
          yPosition += element.height;
          continue;
        }
        
        // Check if we need a new page
        if (yPosition + element.height > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        
        // Set font based on element type - matching the clean document style
        if (element.type === 'h1') {
          doc.setFontSize(18); // Larger for main title
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
        } else if (element.type === 'h2') {
          doc.setFontSize(12); // Standard size for section headings
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
        } else if (element.type === 'h3') {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
        } else if (element.type === 'h4') {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
        } else if (element.type === 'numbered_list') {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
        } else if (element.type === 'bullet_list') {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
        } else if (element.type === 'bold') {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
        } else {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
        }
        
        // Add the text with proper spacing and indentation
        if (element.lines && element.lines.length > 0) {
          for (const line of element.lines) {
            if (line && line.trim()) {
              let xPosition = margin;
              if (element.type === 'bullet_list') {
                xPosition = margin + 8; // Indent bullet points
              } else if (element.type === 'numbered_list') {
                xPosition = margin + 8; // Indent numbered items
              }
              doc.text(line, xPosition, yPosition);
              yPosition += 5; // Consistent line spacing
            }
          }
        } else if (element.text && element.text.trim()) {
          let xPosition = margin;
          if (element.type === 'bullet_list') {
            xPosition = margin + 8;
          } else if (element.type === 'numbered_list') {
            xPosition = margin + 8;
          }
          doc.text(element.text, xPosition, yPosition);
          yPosition += 5;
        }
        
        // Add proper spacing after different element types
        if (element.type === 'h1') {
          yPosition += 10; // More space after main title
        } else if (element.type.startsWith('h')) {
          yPosition += 6; // Space after section headings
        } else if (element.type === 'numbered_list' || element.type === 'bullet_list') {
          yPosition += 3; // Small space after list items
        } else if (element.type === 'text' || element.type === 'bold') {
          yPosition += 4; // Space after paragraphs
        }
      }
      
      // Save the document
      const fileName = this.generatedFileName ? 
        this.generatedFileName.replace('.pdf', '') + '.pdf' : 
        'release-notes.pdf';
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error during PDF export:', error);
      this.showAlert('Export Failed', 'Error exporting PDF. Please try again.', 'error', 'OK');
    }
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
        elements.push({ type: 'spacing', height: 3 });
        continue;
      }
      
      try {
        // Headers
        if (line.startsWith('# ')) {
          const text = line.substring(2).trim();
          if (text) {
            const cleanText = this.removeBoldMarkers(text);
            const wrappedLines = this.wrapText(cleanText, 160);
            elements.push({ type: 'h1', text: cleanText, lines: wrappedLines, height: wrappedLines.length * 6 + 10 });
          }
        } else if (line.startsWith('## ')) {
          const text = line.substring(3).trim();
          if (text) {
            const cleanText = this.removeBoldMarkers(text);
            const wrappedLines = this.wrapText(cleanText, 160);
            elements.push({ type: 'h2', text: cleanText, lines: wrappedLines, height: wrappedLines.length * 6 + 8 });
          }
        } else if (line.startsWith('### ')) {
          const text = line.substring(4).trim();
          if (text) {
            const cleanText = this.removeBoldMarkers(text);
            const wrappedLines = this.wrapText(cleanText, 160);
            elements.push({ type: 'h3', text: cleanText, lines: wrappedLines, height: wrappedLines.length * 6 + 6 });
          }
        } else if (line.startsWith('#### ')) {
          const text = line.substring(5).trim();
          if (text) {
            const cleanText = this.removeBoldMarkers(text);
            const wrappedLines = this.wrapText(cleanText, 160);
            elements.push({ type: 'h4', text: cleanText, lines: wrappedLines, height: wrappedLines.length * 6 + 6 });
          }
        }
        // Lists
        else if (line.startsWith('- ') || line.startsWith('* ')) {
          const text = line.substring(2).trim();
          if (text) {
            const cleanText = this.removeBoldMarkers(text);
            const wrappedLines = this.wrapText(`• ${cleanText}`, 155);
            elements.push({ type: 'bullet_list', text: cleanText, lines: wrappedLines, height: wrappedLines.length * 5 + 3 });
          }
        } else if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^(\d+)\.\s(.+)$/);
          if (match) {
            const number = match[1];
            const text = match[2].trim();
            const cleanText = this.removeBoldMarkers(text);
            const wrappedLines = this.wrapText(`${number}. ${cleanText}`, 155);
            elements.push({ type: 'numbered_list', text: cleanText, lines: wrappedLines, height: wrappedLines.length * 5 + 3 });
          }
        }
        // Tables (basic support)
        else if (line.includes('|')) {
          const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
          if (cells.length > 1) {
            const cleanCells = cells.map(cell => this.removeBoldMarkers(cell));
            const tableLine = cleanCells.join(' | ');
            const wrappedLines = this.wrapText(tableLine, 160);
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
            const wrappedLines = this.wrapText(cleanText, 160);
            elements.push({ type: 'text', text: cleanText, lines: wrappedLines, height: wrappedLines.length * 6 + 3 });
          }
        }
      } catch (error) {
        console.error('Error parsing line:', line, error);
        // Fallback to regular text
        const cleanText = this.removeBoldMarkers(line);
        const wrappedLines = this.wrapText(cleanText, 160);
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
          const wrappedLines = this.wrapText(boldText, 160);
          elements.push({ 
            type: 'bold', 
            text: boldText, 
            lines: wrappedLines, 
            height: wrappedLines.length * 6 + 3 
          });
        }
      } else if (part.trim()) {
        // Regular text
        const wrappedLines = this.wrapText(part, 160);
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

  // Helper method to wrap text
  private wrapText(text: string, maxWidth: number): string[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      if (!word) continue; // Skip empty words
      
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      if (testLine.length <= maxWidth / 2.8) { // More precise character width for cleaner wrapping
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
        this.products = data.map((product: any) => product.name);
        // Also set the full product list with IDs so that getSelectedProductId() works
        this.onboardingService.setFullProductList(data);
      },
    });
  }
  // getting documentation history from api
  gettingDocumentationHistoryFromApi() {
    this.apiService.getDocumentationHistory().subscribe({
      next: async (data: any) => {
        this.releaseHistory = Array.isArray(data) ? data : [];
        this.filteredReleaseHistory = [...this.releaseHistory];
      },  
      error: (err) => {
        console.error('Error fetching documentation history:', err);
        this.releaseHistory = [];
        this.filteredReleaseHistory = [];
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

  // Convert markdown to HTML for publishing
  private convertMarkdownToHTML(markdown: string): string {
    if (!markdown || typeof markdown !== 'string') {
      return '';
    }

    let html = markdown;

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
