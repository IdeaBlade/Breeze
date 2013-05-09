using System;
using System.Collections.Generic;
using System.Data.Entity;

namespace Inheritance.Models
{
    // DEMONSTRATION/DEVELOPMENT ONLY
    public class InheritanceDbInitializer :
        DropCreateDatabaseAlways<InheritanceContext> // re-creates every time the server starts
    //DropCreateDatabaseIfModelChanges<InheritanceContext> 
    {
        private static int _idSeed = 1;
        private static DateTime _baseCreatedAt = new DateTime(2012, 8, 22, 9, 0, 0);
        private static DateTime _depositedAt = new DateTime(2012, 9, 1, 1, 0, 0);

        protected override void Seed(InheritanceContext context)
        {
            AddAccountTypes(context);
            AddStatuses(context);
            ResetDatabase(context);
        }

        private static void AddAccountTypes(InheritanceContext context)
        {
            var accountTypes = new List<AccountType>
                {
                    new AccountType {Id = 1, Name = "Checking"},
                    new AccountType {Id = 2, Name = "Saving"},
                    new AccountType {Id = 3, Name = "Money Market"},

                    new AccountType {Id = 4, Name = "Amex"},
                    new AccountType {Id = 5, Name = "MC"},
                    new AccountType {Id = 6, Name = "Visa"}
                };
            accountTypes.ForEach(_ => context.AccountTypes.Add(_));
        }
        private static void AddStatuses(InheritanceContext context)
        {
            context.StatusTPHs.Add(new StatusTPH { Id = 1, Name = "Open"});
            context.StatusTPHs.Add(new StatusTPH { Id = 2, Name = "Closed" });
            context.StatusTPHs.Add(new StatusTPH { Id = 3, Name = "Suspended" });

            context.StatusTPTs.Add(new StatusTPT { Id = 1, Name = "Open" });
            context.StatusTPTs.Add(new StatusTPT { Id = 2, Name = "Closed" });
            context.StatusTPTs.Add(new StatusTPT { Id = 3, Name = "Suspended" });
        }

        public static void ResetDatabase(InheritanceContext context)
        {
            IBillingDetail[] billingDetails;

            billingDetails = MakeData<BillingDetailTPH, BankAccountTPH, CreditCardTPH>("TPH");
            Array.ForEach((BillingDetailTPH[])billingDetails, _ =>
                {
                    context.BillingDetailTPHs.Add(_);
                    AddDeposits(_, context.DepositTPHs);
                });

            billingDetails = MakeHierarchyDataTPH();
            Array.ForEach((BillingDetailTPH[])billingDetails, _ =>
            {
                context.BillingDetailTPHs.Add(_);
                AddDeposits(_, context.DepositTPHs);
            });

            billingDetails = MakeData<BillingDetailTPT, BankAccountTPT, CreditCardTPT>("TPT");
            Array.ForEach((BillingDetailTPT[])billingDetails, _ =>
                {
                    context.BillingDetailTPTs.Add(_);
                    AddDeposits(_, context.DepositTPTs);
                });

            _idSeed = 1; // reset for TPC ... because we can
            billingDetails = MakeData<BillingDetailTPC, BankAccountTPC, CreditCardTPC>("TPC");
            Array.ForEach((BillingDetailTPC[])billingDetails, _ =>
                {
                    context.BillingDetailTPCs.Add(_);
                    AddDeposits(_, context.DepositTPCs);
                });

            context.SaveChanges(); // Save all inserts
        }

        #region Data creation

        private static TBilling[] MakeData<TBilling, TBankAccount, TCreditCard>(string inheritanceModel)
            where TBilling : IBillingDetail
            where TBankAccount : TBilling, IBankAccount, new()
            where TCreditCard : TBilling, ICreditCard, new()
        {

            var billingDetails = new[]
                {
                    // Owner, Number, AccountTypeId, StatusId, ExpiryMonth, ExpiryYear
                    (TBilling) CreateCreditCard<TCreditCard>("Abby Road", "999-999-999", 4, 1, "04", "2014"),
                    (TBilling) CreateCreditCard<TCreditCard>("Bobby Tables", "987-654-321", 6, 1, "03", "2014"),

                    // Owner, Number, AccountTypeId, StatusId, BankName, Swift
                    (TBilling) CreateBankAccount<TBankAccount>("Dot Com", "777-777", 3, 2, "Bank of Sevens", "BOFSWXYZ")
                    ,
                    (TBilling)
                    CreateBankAccount<TBankAccount>("Early Riser", "11-11-1111", 2, 1, "Snake Eye Bank", "SNEBSSSS"),
                    (TBilling)
                    CreateBankAccount<TBankAccount>("Cathy Corner", "123-456", 1, 1, "Bank of Fun", "BOFFDEFX"),

                    (TBilling) CreateCreditCard<TCreditCard>("Ginna Lovette", "111-222-333", 5, 2, "02", "2014"),
                    (TBilling) CreateCreditCard<TCreditCard>("Faith Long", "123-456-789", 4, 3, "04", "2015")
                };
            Array.ForEach(billingDetails, _ => _.InheritanceModel = inheritanceModel);

            return billingDetails;
        }

        private static IBillingDetail CreateBankAccount<T>(
            string owner, string number, int accountTypeId, int statusId, string bankName, string swift)
            where T : IBankAccount, new()
        {
            _baseCreatedAt = _baseCreatedAt.AddMinutes(1);
            return new T
                {
                    Id = _idSeed++,
                    CreatedAt = _baseCreatedAt,
                    Owner = owner,
                    Number = number,
                    BankName = bankName,
                    Swift = swift,
                    AccountTypeId = accountTypeId,
                    StatusId = statusId
                };
        }

        private static IBillingDetail CreateCreditCard<T>(
            string owner, string number, int accountTypeId, int statusId, string expiryMonth, string expiryYear)
            where T : ICreditCard, new()
        {
            _baseCreatedAt = _baseCreatedAt.AddMinutes(1);
            return new T
                {
                    Id = _idSeed++,
                    CreatedAt = _baseCreatedAt,
                    Owner = owner,
                    Number = number,
                    AccountTypeId = accountTypeId,
                    ExpiryMonth = expiryMonth,
                    ExpiryYear = expiryYear,
                    StatusId = statusId
                };
        }

        private static void AddDeposits<TBilling, TDeposit>(TBilling billingDetail, DbSet<TDeposit> dbset)
            where TBilling : IBillingDetail
            where TDeposit : class, IDeposit, new()
        {
            var account = billingDetail as IBankAccount;
            if (null == account) return;

            var accountId = account.Id;
            var amount = 0;
            var deposits = new[]
                {
                    new TDeposit {BankAccountId = accountId, Amount = (amount += 100), Deposited = _depositedAt},
                    new TDeposit {BankAccountId = accountId, Amount = (amount += 100), Deposited = _depositedAt},
                    new TDeposit {BankAccountId = accountId, Amount = (amount += 100), Deposited = _depositedAt},
                };
            Array.ForEach(deposits, _ => dbset.Add(_));
        }

        #endregion

        #region Hierarchical data creation

        private static BillingDetailTPH[] MakeHierarchyDataTPH()
        {

            var parentCc = (CreditCardTPH)
                CreateCreditCard<CreditCardTPH>("Donald Duck", "111-11-111", 4, 1, "04", "2016");

            var parentBa = (BankAccountTPH)
                CreateBankAccount<BankAccountTPH>("Agamemnon", "000-000", 3, 2, "Bank of Atreus", "BOFATRUS");

            var billingDetails = new BillingDetailTPH[] {
                parentCc, parentBa,

                // Parent, Owner, Number, AccountTypeId, StatusId, ExpiryMonth, ExpiryYear
                CreateChildCreditCard(parentCc, "Hewey", "888-888-888", 4, 1, "08", "2017"),
                CreateChildCreditCard(parentCc, "Louis", "789-456-123", 6, 1, "07", "2018"),
                CreateChildCreditCard(parentCc, "Dewey", "333-222-111", 5, 2, "06", "2018"),

                // Parent, Owner, Number, AccountTypeId, StatusId
                CreateChildBankAccount(parentBa, "Elecktra" , "111-111", 3, 2),
                CreateChildBankAccount(parentBa, "Orestes" ,  "122-222", 2, 1),
                CreateChildBankAccount(parentBa, "Iphigenie", "333-333", 1, 1)
           };
            Array.ForEach(billingDetails, _ => _.InheritanceModel = "TPH");

            return billingDetails;
        }

        private static BankAccountTPH CreateChildBankAccount(
            BankAccountTPH parent, string owner, string number, int accountTypeId, int statusId)
        {
            _baseCreatedAt = _baseCreatedAt.AddMinutes(1);
            return new BankAccountTPH
            {
                Id = _idSeed++,
                CreatedAt = _baseCreatedAt,
                Owner = owner,
                Number = number,
                BankName = parent.BankName,
                Swift = parent.Swift,
                AccountTypeId = accountTypeId,
                StatusId = statusId,
                ParentId = parent.Id
            };
        }

        private static CreditCardTPH CreateChildCreditCard(
            CreditCardTPH parent, string owner, string number, int accountTypeId, int statusId, string expiryMonth,
            string expiryYear)
        {
            _baseCreatedAt = _baseCreatedAt.AddMinutes(1);
            return new CreditCardTPH
            {
                Id = _idSeed++,
                CreatedAt = _baseCreatedAt,
                Owner = owner,
                Number = number,
                AccountTypeId = accountTypeId,
                ExpiryMonth = expiryMonth,
                ExpiryYear = expiryYear,
                StatusId = statusId,
                ParentId = parent.Id
            };
        }

        #endregion

        public static void PurgeDatabase(InheritanceContext context)
        {
            var depositsTPH = context.DepositTPHs;
            foreach (var deposit in depositsTPH)
            {
                depositsTPH.Remove(deposit);
            }
            var depositsTPT = context.DepositTPTs;
            foreach (var deposit in depositsTPT)
            {
                depositsTPT.Remove(deposit);
            }
            var depositsTPC = context.DepositTPCs;
            foreach (var deposit in depositsTPC)
            {
                depositsTPC.Remove(deposit);
            }

            var billingDetailsTPH = context.BillingDetailTPHs;
            foreach (var billingDetail in billingDetailsTPH)
            {
                billingDetailsTPH.Remove(billingDetail);
            }
            var billingDetailsTPT = context.BillingDetailTPTs;
            foreach (var billingDetail in billingDetailsTPT)
            {
                billingDetailsTPT.Remove(billingDetail);
            }
            var billingDetailsTPC = context.BillingDetailTPCs;
            foreach (var billingDetail in billingDetailsTPC)
            {
                billingDetailsTPC.Remove(billingDetail);
            }
            context.SaveChanges();
        }
    }
}