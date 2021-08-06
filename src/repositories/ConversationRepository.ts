import { Database as SqlJsDatabase } from 'sql.js'
import { Repository } from '@/repositories/Repository'
import { Conversation } from '@/models/Conversation'
import { ContactEntries } from './ContactRepository'

class ConversationRepository implements Repository<Conversation> {
  private conversations: Conversation[] = []
  private db: SqlJsDatabase
  private contacts: ContactEntries

  constructor(db: SqlJsDatabase, contacts: ContactEntries) {
    this.db = db
    this.contacts = contacts
  }

  public async getAll(): Promise<Conversation[]> {
    const query = `
      SELECT
        messages.chat_identifier,
        messages.is_from_me,
        messages.date,
        messages.text
      FROM (
        SELECT
          chat.chat_identifier,
          message.ROWID,
          message.is_from_me,
          message.date,
          message.text
        FROM message
        JOIN chat_message_join
          ON message.ROWID = chat_message_join.message_id
        JOIN chat
          ON chat.ROWID = chat_message_join.chat_id
        ORDER BY message.date DESC
      ) AS messages
      GROUP BY messages.chat_identifier
      ORDER BY messages.date DESC
    `
    const conversationsTemp = this.db.exec(query)?.[0]?.values

    this.conversations = await Promise.all(
      conversationsTemp.map(async(conversation) => {
        const contact = this.contacts[(conversation[0] as string)]
        const name = (contact && contact.firstName
          ? contact.lastName ? `${contact.firstName} ${contact.lastName}` : contact.firstName
          : conversation[0])?.toString() || ''
        const initials = name?.replace(/[^a-zA-Z\s]/g, '').match(/\b\w/g)?.join('').toUpperCase() || ''
        return {
          id: conversation[0]?.toString() || '',
          fromMe: Boolean(conversation[1]),
          date: conversation[2]?.toString() || '',
          text: conversation[3]?.toString() || '',
          name,
          initials
        } as Conversation
      })
    )

    return this.conversations
  }
}

export default ConversationRepository