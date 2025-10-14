import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('weather')
export class Weather {
  @PrimaryGeneratedColumn()
  id: number; 

  @Column()
  destination: string; // Lookup field (e.g., BKK)

  @Column()
  date: string; // The specific date of the forecast

  @Column('real') 
  tempMin: number; // Minimum temperature

  @Column('real') 
  tempMax: number; // Maximum temperature

  @Column()
  condition: string; // e.g., 'Sunny', 'Rainy'
}
