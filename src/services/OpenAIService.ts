import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class OpenAIService {

  constructor(private http: HttpClient) {}

  // TODO: Implement OpenAI API integration
  getResponse(data: any) {
    // TODO: Send request to OpenAI API
    return;
  }

  // TODO: Implement error handling
}
