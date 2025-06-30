import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class GroqClient {
  // TODO: Inject HttpClient instance
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  // TODO: Implement Groq API calls
  async search(query: string) {
    // TODO: Make API call to Groq
    return;
  }

  // TODO: Implement other Groq API calls
}
