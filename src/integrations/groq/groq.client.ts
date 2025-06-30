import { Injectable } from '@nestjs/common';

import axios from 'axios';


@Injectable()

export class GroqClient {

  private readonly groqApiUrl = 'https://api.groq.io';


  async query(query: string): Promise<any> {

    // TODO: Implement Groq API query logic

    throw new Error('Not implemented');

  }


  async search(query: string): Promise<any> {

    // TODO: Implement Groq API search logic

    throw new Error('Not implemented');

  }

}
