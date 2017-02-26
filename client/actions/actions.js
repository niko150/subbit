const moment = require('moment')

const addMemberData = (memberData) => {
  return { type: 'ADD_MEMBERDATA', memberData }
}

const changeMemberView = (memberView) => {
  return { type: 'CHANGE_MEMBER_VIEW', memberView }
}

const changeTransactionView = (transactionView) => {
  return { type: 'CHANGE_TRANSACTION_VIEW', transactionView }
}

const changeUser = (username) => {
  return { type: 'CHANGE_USER', username }
}

const changeView = (view) => {
  return { type: 'CHANGE_VIEW', view }
}

const getMemberData = (memberData) => {
  return { type: 'GET_MEMBERDATA', memberData }
}

const getTransactionDetails = (transactionDetails) => {
  return { type: 'GET_TRANSACTION_DETAILS', transactionDetails }
}

const getUsers = (users) => {
  return { type: 'GET_USERS', users }
}

const linkAccount = () => {
  return { type: 'ADD_ACCOUNTS' }
}

const linkDone = () => {
  return { type: 'ADD_DONE' }
}

const sortingTransStart = () => {
  return { type: 'SORT_TRANSACTIONS', doneSorting: false }
}

const sortingTransEnd = (transactionsByMonth, monthsByYear) => {
  return { type: 'SORT_TRANSACTIONS', transactionsByMonth, monthsByYear, doneSorting: true }
}

const toggleAccounts = (institutions) => {
  return { type: 'TOGGLE_ACCOUNTS', institutions }
}

const fetchUsers = () => (dispatch) => {
  fetch('/users')
    .then(res => res.json())
    .then(res => dispatch(getUsers(res)))
    .catch(err => console.error(err))
}

const fetchAccounts = (username) => (dispatch) => {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username })
  }
  fetch('/connect/get', options)
    .then(res => res.json())
    .then(res => {
      dispatch(sortingTransStart())
      dispatch(getMemberData(res))
      dispatch(sortTransactions(res.transactions))
      dispatch(changeView('member'))
    })
    .catch(err => console.error(err))
}


// Need to sort all of the transactions in the store by date descending
const sortTransactions = (unsorted) => dispatch => {

  // Transaction categories to ignore
  const ignore = [
    'Arts and Entertainment',
    'ATM',
    'Bank Fees',
    'Credit Card',
    'Deposit',
    'Food and Drink',
    'Groceries',
    'Gas Stations',
    'Government Departments and Agencies',
    'Interest',
    'Payroll',
    'Restaurants',
    'Running',
    'Shops',
    'Stadiums and Arenas',
    'Supermarkets and Groceries',
    'Tax',
    'Third Party',
    'Travel',
    'Withdrawal'
  ]

  // Sort transactions by date descending, and filter out transactions
  // that have a non-zero negative amount & lie within ignored categories
  const transactions = unsorted.slice()
    .sort((a, b) => {
      return moment(a.date, 'YYYY-MM-DD').diff(moment(b.date, 'YYYY-MM-DD'), 'days') >= 0 ? -1 : 1
    })
    .filter(transaction => {
      let check = transaction.category.filter(category => {
        return ignore.includes(category)
      })
      return transaction.amount >= 0 && !check.length ? true : false
    })

  // Iterate through all of the transactions (by month)
  // Get the index ranges of all transactions in the same month and year
  // Build an array of arrays grouped by month and year, date descending
  let increment = 1
  const monthsByYear = []
  const transactionsByMonth = []

  for (let start = 0; start < transactions.length; start += increment) {

    let end = -1
    let monthAndYear = moment(transactions[start].date, 'YYYY-MM-DD').format('MMMM YYYY')
    monthsByYear.push(monthAndYear)

    // Check for the next instance of a differing month and year
    for (let check = start + 1; check < transactions.length; check++) {
      if (moment(transactions[check].date, 'YYYY-MM-DD').format('MMMM YYYY') !== monthAndYear) {
        end = check
        break
      }
    }

    // If there are still more transactions, check the rest
    if (end >= 1) {
      transactionsByMonth.push(transactions.slice(start, end))
      increment = end - start
    }
    else {
      transactionsByMonth.push(transactions.slice(start, transactions.length))
      start = transactions.length
    }

  }

  // Map through all monthly transactions and check for reoccurrance
  const filteredTransactions = transactionsByMonth.map((transactionsForTheMonth, index) => {

    const filtered = transactionsForTheMonth.filter(thisMonthsTransaction => {

      // 4 day buffer
      const lastDateLowerBound = -34
      const lastDateUpperBound = -26
      const nextDateLowerBound = 26
      const nextDateUpperBound = 34

      const nameCheck = thisMonthsTransaction.name.split(' ').slice(0, 2).join(' ')

      if (index < transactionsByMonth.length - 1) {
        // Check for identical transactions in the month prior
        const lastMonthsTransactions = transactionsByMonth[index + 1]
        for (let lastIndex = 0; lastIndex < lastMonthsTransactions.length; lastIndex++) {
          let foundDate = moment(lastMonthsTransactions[lastIndex].date, 'YYYY-MM-DD').diff(thisMonthsTransaction.date, 'days')

          if (lastMonthsTransactions[lastIndex].name.includes(nameCheck) &&
                foundDate >= lastDateLowerBound &&
                foundDate <= lastDateUpperBound) {
            return true
          }
        }
      }

      if (index > 0) {
        // Check for identical transactions in the month ahead
        const nextMonthsTransactions = transactionsByMonth[index - 1]
        for (let nextIndex = 0; nextIndex < nextMonthsTransactions.length; nextIndex++) {
          let foundDate = moment(nextMonthsTransactions[nextIndex].date, 'YYYY-MM-DD').diff(thisMonthsTransaction.date, 'days')

          if (nextMonthsTransactions[nextIndex].name.includes(nameCheck) &&
                foundDate >= nextDateLowerBound &&
                foundDate <= nextDateUpperBound) {
            return true
          }
        }
      }

      return false
    })

    return filtered

  })

  dispatch(sortingTransEnd(filteredTransactions, monthsByYear))

}

module.exports = {
  addMemberData,
  changeMemberView,
  changeTransactionView,
  changeUser,
  changeView,
  fetchAccounts,
  fetchUsers,
  getTransactionDetails,
  getMemberData,
  getUsers,
  linkAccount,
  linkDone,
  sortTransactions,
  sortingTransStart,
  sortingTransEnd,
  toggleAccounts
}
