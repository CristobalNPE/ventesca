/*
 Returns the 'where' part of the query to get only the 
objects related to the user's corresponding business.
 Mostly to avoid code repetition since its used in most
queries through the application.
*/
export function getWhereBusinessQuery(userId: string) {
	return { business: { users: { some: { id: userId } } } }
}
