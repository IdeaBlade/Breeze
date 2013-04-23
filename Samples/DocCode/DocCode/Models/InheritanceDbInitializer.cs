using System;
using System.Data.Entity;

namespace Inheritance.Models
{
    // DEMONSTRATION/DEVELOPMENT ONLY
    public class InheritanceDbInitializer :
        DropCreateDatabaseAlways<InheritanceContext> // re-creates every time the server starts
    //DropCreateDatabaseIfModelChanges<InheritanceContext> 
    {
        protected override void Seed(InheritanceContext context)
        {
            SeedDatabase(context);
        }

        public static void SeedDatabase(InheritanceContext context)
        {

            IBillingDetail[] billingDetails;

            billingDetails = MakeData<BillingDetailTPH, BankAccountTPH, CreditCardTPH>("TPH");
            Array.ForEach((BillingDetailTPH[])billingDetails, _ => context.BillingDetailTPHs.Add(_));


            billingDetails = MakeData<BillingDetailTPT, BankAccountTPT, CreditCardTPT>("TPT");
            Array.ForEach((BillingDetailTPT[])billingDetails, _ => context.BillingDetailTPTs.Add(_));

            var tpcId = 1;
            billingDetails = MakeData<BillingDetailTPC, BankAccountTPC, CreditCardTPC>("TPC");
            Array.ForEach((BillingDetailTPC[])billingDetails, _ =>
                {
                    _.Id = tpcId++;
                    context.BillingDetailTPCs.Add(_);
                });

            context.SaveChanges(); // Save 'em
        }

        private static TBilling[] MakeData<TBilling, TBankAccount, TCreditCard>(string inheritanceModel)
            where TBilling : IBillingDetail
            where TBankAccount : TBilling, IBankAccount, new()
            where TCreditCard : TBilling, ICreditCard, new()
        {
              _baseCreatedAt = new DateTime(2012, 8, 22, 9, 0, 0);

            var billingDetails = new [] {
                (TBilling) CreateCreditCard<TCreditCard>("Abby Road"    , "999-999-999", 1, "04", "2014"),
                (TBilling) CreateCreditCard<TCreditCard>("Bobby Tables" , "987-654-321", 3, "03", "2014"),

                (TBilling) CreateBankAccount<TBankAccount>("Cathy Corner", "123-456", "Bank of Fun", "BOFFDEFX"),
                (TBilling) CreateBankAccount<TBankAccount>("Early Riser" , "11-11-1111", "Snake Eye Bank", "SNEBSSSS"),
                (TBilling) CreateBankAccount<TBankAccount>("Dot Com"     , "777-777", "Bank of Sevens", "BOFSWXYZ"),

                (TBilling) CreateCreditCard<TCreditCard>("Ginna Lovette", "111-222-333", 2, "02", "2014"),
                (TBilling) CreateCreditCard<TCreditCard>("Faith Long"   , "123-456-789", 1, "01", "2014")
           };
           Array.ForEach(billingDetails, _ => _.inheritanceModel = inheritanceModel);

           return billingDetails;
        }

        private static IBillingDetail CreateBankAccount<T>  (
            string owner, string number, string bankName, string swift) 
            where T : IBankAccount, new()
        {
            _baseCreatedAt = _baseCreatedAt.AddMinutes(1);
            return new T
            {
                CreatedAt = _baseCreatedAt,
                Owner = owner,
                Number = number,
                BankName = bankName,
                Swift = swift
            };
        }

        private static IBillingDetail CreateCreditCard<T>(
            string owner, string number, int cardType, string expiryMonth, string expiryYear)
            where T : ICreditCard, new()
        {
            _baseCreatedAt = _baseCreatedAt.AddMinutes(1);
            return new T
            {
                CreatedAt = _baseCreatedAt,
                Owner = owner,
                Number = number,
                CardType = cardType,
                ExpiryMonth = expiryMonth,
                ExpiryYear = expiryYear
            };
        }
        private static DateTime _baseCreatedAt;

        public static void PurgeDatabase(InheritanceContext context)
        {
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