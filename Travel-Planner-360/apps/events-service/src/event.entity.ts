
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('event')
export class Event {
  @PrimaryGeneratedColumn()
  id: number; 

  @Column()
  name: string; // Contract field

  @Column()
  date: string; // Contract field

  @Column()
  category: string; // Contract field (e.g., 'Music Festival', 'Conference')

  @Column()
  destination: string; // Lookup field (e.g., BKK, MLE)
}