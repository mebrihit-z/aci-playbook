import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  
  createUserSettingsUrl = `${environment.apiBaseUrl}/api/v1/create_user_settings`;
  getUserSettingsUrl = `${environment.apiBaseUrl}/api/v1/user_settings`;
  chatIdUrl = `${environment.apiBaseUrl}/api/v1/get_chat`;
  baseUrl = `${environment.apiBaseUrl}/api/v1`;
  // documentation
  documentationUrl = `${environment.documentationUrl}/api/v1/generated-documents`;
  // templatesUrl = `${environment.documentationUrl}/api/v1/documentation-types`;
  templatesUrl = `${environment.documentationUrl}/api/v1/documentation-types/product`;
  documentationBaseUrl = `${environment.documentationUrl}/api/v1`;

  // constructor
  constructor(private http: HttpClient, private userService: UserService) {}
  // create user setting
  createUserSetting(payload: any) {
    return this.http.post(this.createUserSettingsUrl, payload);
  }
  getUserSettings<T>(userId: any): Observable<T> {
    return this.http.get<T>(`${this.getUserSettingsUrl}/${userId}`);
  }
  generateDocumentation(payload: FormData) {
    return this.http.post(this.documentationUrl, payload, {
    });
  }
  getDocumentationHistory() {
    return this.http.get(this.documentationUrl);
  }
  getDocumentationContent(documentId: string) {
    return this.http.get(`${this.documentationUrl}/${documentId}`);
  }
  getTemplates(productId: any) {
    return this.http.get(`${this.templatesUrl}/${productId}`);
  }
  getSelectedQuestion<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.chatIdUrl}/${endpoint}`);
  }
  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${endpoint}`);
  }
  post<T>(endpoint: string, data: any, responseType: 'json' | 'text' = 'json'): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      responseType: responseType as 'json' & 'text' 
    });
  }
  
  put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${endpoint}`, data);
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${endpoint}`);
  }
  deleteSingleGeneratedDocument(documentId: string): Observable<any> {
    return this.http.delete<any>(`${this.documentationUrl}/${documentId}`);
  }
  // === Token-aware methods ===

  /**
   * Get the current access token
   * @returns Promise<string | undefined> - The access token or undefined if not available
   */
  async getToken(): Promise<string | undefined> {
    return await this.userService.getValidToken();
  }

  /**
   * Create authenticated HTTP headers with token
   * @returns Promise<HttpHeaders> - Headers with Authorization token
   */
  async getAuthHeaders(): Promise<HttpHeaders> {
    const token = await this.getToken();
    let headers = new HttpHeaders();
    console.log("token: ", token);
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  /**
   * Make an authenticated GET request
   * @param endpoint - The API endpoint
   * @returns Observable<T> - The response data
   */
  getWithAuth<T>(endpoint: string): Observable<T> {
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => {
        return this.http.get<T>(`${this.baseUrl}/${endpoint}`, { headers });
      })
    );
  }

  /**
   * Make an authenticated POST request
   * @param endpoint - The API endpoint
   * @param data - The data to send
   * @returns Observable<T> - The response data
   */
  postWithAuth<T>(endpoint: string, data: any): Observable<T> {
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => {
        return this.http.post<T>(`${this.documentationBaseUrl }/${endpoint}`, data, { headers });
      })
    );
  }

  /**
   * Make an authenticated PUT request
   * @param endpoint - The API endpoint
   * @param data - The data to send
   * @returns Observable<T> - The response data
   */
  putWithAuth<T>(endpoint: string, data: any): Observable<T> {
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => {
        return this.http.put<T>(`${this.documentationBaseUrl}/${endpoint}`, data, { headers });
      })
    );
  }

  /**
   * Make an authenticated DELETE request
   * @param endpoint - The API endpoint
   * @returns Observable<T> - The response data
   */
  deleteWithAuth<T>(endpoint: string): Observable<T> {
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => {
        return this.http.delete<T>(`${this.baseUrl}/${endpoint}`, { headers });
      })
    );
  }

  /**
   * Check if user is authenticated
   * @returns boolean - True if authenticated, false otherwise
   */
  isAuthenticated(): boolean {
    return this.userService.isAuthenticated();
  }
}
