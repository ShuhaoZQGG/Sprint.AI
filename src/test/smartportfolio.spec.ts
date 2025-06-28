import { TestBed } from '@angular/core/testing';
import { SmartPortfolio } from './smartportfolio.component';

describe('SmartPortfolio', () => {
  let component: SmartPortfolio;
  let fixture: ComponentFixture<SmartPortfolio);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SmartPortfolio ]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SmartPortfolio);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Implement tests for SmartPortfolio
});