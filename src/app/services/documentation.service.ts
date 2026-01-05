import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DocumentationService {
  // skip tooltip value
  skipTooltipValue: boolean = false;

  // Use BehaviorSubjects to maintain state and allow subscriptions
  private documentationLandingPageSubject = new BehaviorSubject<boolean>(true);
  private documentationGeneratingPageSubject = new BehaviorSubject<boolean>(false);
  private documentationGeneratedPageSubject = new BehaviorSubject<boolean>(false);

   // State management for user form data
   private sourcesSubject = new BehaviorSubject<{ newSource: string }[]>([]);
   private pdfSourcesSubject = new BehaviorSubject<File[]>([]);
   private selectedTemplateSubject = new BehaviorSubject<any>('Select Template');
   private selectedTemplateIdSubject = new BehaviorSubject<string>('');
   private selectedProductSubject = new BehaviorSubject<string>('');
   private generatedContentSubject = new BehaviorSubject<string>('');
   private templatesListSubject = new BehaviorSubject<any[]>([]);
 
   // Track current documentation page state
   private currentPageSubject = new BehaviorSubject<'landing' | 'generating' | 'generated'>('landing');
   
   // Flag to indicate fields should be cleared when navigating to generating page
   private shouldClearFieldsOnNavigate = false;

  // Expose observables for components to subscribe to
  documentationLandingPage$ = this.documentationLandingPageSubject.asObservable();
  documentationGeneratingPage$ = this.documentationGeneratingPageSubject.asObservable();
  documentationGeneratedPage$ = this.documentationGeneratedPageSubject.asObservable();
  // Expose observables for form data
  sources$ = this.sourcesSubject.asObservable();
  pdfSources$ = this.pdfSourcesSubject.asObservable();
  selectedTemplate$ = this.selectedTemplateSubject.asObservable();
  selectedTemplateId$ = this.selectedTemplateIdSubject.asObservable();
  selectedProduct$ = this.selectedProductSubject.asObservable();
  generatedContent$ = this.generatedContentSubject.asObservable();
  currentPage$ = this.currentPageSubject.asObservable();
  templatesList$ = this.templatesListSubject.asObservable();

  // Keep backward compatibility with getters
  get documentationLandingPage(): boolean {
    return this.documentationLandingPageSubject.value;
  }

  get documentationGeneratingPage(): boolean {
    return this.documentationGeneratingPageSubject.value;
  }

  get documentationGeneratedPage(): boolean {
    return this.documentationGeneratedPageSubject.value;
  } 

  setDocumentationLandingPage(documentationLandingPage: boolean) {
    this.documentationLandingPageSubject.next(documentationLandingPage);
    if (documentationLandingPage) {
      this.setCurrentPage('landing');
    }
  }

  getDocumentationLandingPage(): boolean {
    return this.documentationLandingPageSubject.value;
  }

  setDocumentationGeneratingPage(documentationGeneratingPage: boolean) {
    this.documentationGeneratingPageSubject.next(documentationGeneratingPage);
    if (documentationGeneratingPage) {
      this.setCurrentPage('generating');
    }
  }

  getDocumentationGeneratingPage(): boolean {
    return this.documentationGeneratingPageSubject.value;
  }

  setDocumentationGeneratedPage(documentationGeneratedPage: boolean) {
    this.documentationGeneratedPageSubject.next(documentationGeneratedPage);
    if (documentationGeneratedPage) {
      this.setCurrentPage('generated');
    }
  }

  getDocumentationGeneratedPage(): boolean {
    return this.documentationGeneratedPageSubject.value;
  }

  // Getters for form data
  get sources(): { newSource: string }[] {
    return this.sourcesSubject.value;
  }

  get pdfSources(): File[] {
    return this.pdfSourcesSubject.value;
  }

  get selectedTemplate(): any {
    return this.selectedTemplateSubject.value;
  }

  get selectedTemplateId(): string {
    return this.selectedTemplateIdSubject.value;
  }

  get selectedProduct(): string {
    return this.selectedProductSubject.value;
  }

  get templatesList(): any[] {
    return this.templatesListSubject.value;
  }

  get generatedContent(): string {
    return this.generatedContentSubject.value;
  }

  get currentPage(): 'landing' | 'generating' | 'generated' {
    return this.currentPageSubject.value;
  }

  // Setters for form data
  setSources(sources: { newSource: string }[]) {
    this.sourcesSubject.next(sources);
  }

  setPdfSources(pdfSources: File[]) {
    this.pdfSourcesSubject.next(pdfSources);
  }

  setSelectedTemplate(template: any) {
    this.selectedTemplateSubject.next(template);
    // If template is an object with id, extract the id
    if (template && typeof template === 'object' && template.id) {
      this.selectedTemplateIdSubject.next(template.id);
    } else if (typeof template === 'string') {
      // If template is just a string (name), we'll need to find the id from the templates list
      // This will be handled in the component
      this.selectedTemplateIdSubject.next('');
    }
  }

  setSelectedTemplateId(templateId: string) {
    this.selectedTemplateIdSubject.next(templateId);
  }

  setTemplatesList(templates: any[]) {
    this.templatesListSubject.next(templates);
  }

  setSelectedProduct(product: string) {
    console.log("DocumentationService.setSelectedProduct called with:", product);
    console.trace("Stack trace for setSelectedProduct");
    this.selectedProductSubject.next(product);
  }

  setGeneratedContent(content: string) {
    this.generatedContentSubject.next(content);
  }

  setCurrentPage(page: 'landing' | 'generating' | 'generated') {
    this.currentPageSubject.next(page);
  }

  // Helper methods to add/remove sources
  addSource(source: { newSource: string }) {
    const currentSources = this.sourcesSubject.value;
    this.sourcesSubject.next([...currentSources, source]);
  }

  removeSource(index: number) {
    const currentSources = this.sourcesSubject.value;
    const updatedSources = currentSources.filter((_, i) => i !== index);
    this.sourcesSubject.next(updatedSources);
  }

  addPdfSource(file: File) {
    const currentPdfSources = this.pdfSourcesSubject.value;
    this.pdfSourcesSubject.next([...currentPdfSources, file]);
  }

  removePdfSource(index: number) {
    const currentPdfSources = this.pdfSourcesSubject.value;
    const updatedPdfSources = currentPdfSources.filter((_, i) => i !== index);
    this.pdfSourcesSubject.next(updatedPdfSources);
  }

  // Clear all sources (URLs)
  clearSources() {
    this.sourcesSubject.next([]);
  }

  // Clear all PDF sources
  clearPdfSources() {
    this.pdfSourcesSubject.next([]);
  }

  // Clear all form data
  clearFormData() {
    this.sourcesSubject.next([]);
    this.pdfSourcesSubject.next([]);
    this.selectedTemplateSubject.next('Select Template');
    this.generatedContentSubject.next('');
  }

  // Set flag to clear fields on next navigation to generating page
  setShouldClearFieldsOnNavigate(shouldClear: boolean) {
    this.shouldClearFieldsOnNavigate = shouldClear;
  }

  // Check and reset the flag (returns true if flag was set, then resets it)
  checkAndResetClearFieldsFlag(): boolean {
    const shouldClear = this.shouldClearFieldsOnNavigate;
    this.shouldClearFieldsOnNavigate = false;
    return shouldClear;
  }

  // Restore documentation state from current page
  restoreDocumentationState() {
    const currentPage = this.currentPageSubject.value;
    
    // Reset all page states first
    this.documentationLandingPageSubject.next(false);
    this.documentationGeneratingPageSubject.next(false);
    this.documentationGeneratedPageSubject.next(false);
    
    // Set the correct page state based on current page
    switch (currentPage) {
      case 'landing':
        this.documentationLandingPageSubject.next(true);
        break;
      case 'generating':
        this.documentationGeneratingPageSubject.next(true);
        break;
      case 'generated':
        this.documentationGeneratedPageSubject.next(true);
        break;
    }
  }
}
