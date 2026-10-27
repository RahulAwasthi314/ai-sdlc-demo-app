using InvoiceApp.Domain;
using Xunit;

namespace InvoiceApp.Tests;

/// <summary>Unit tests for volume, loyalty, and non-profit discount calculations.</summary>
public class DiscountCalculatorTests
{
    private readonly DiscountCalculator _calculator = new();

    [Theory]
    [InlineData(150, 0.15)]
    [InlineData(100, 0.15)]
    [InlineData(99, 0.10)]
    [InlineData(50, 0.10)]
    [InlineData(49, 0.05)]
    [InlineData(10, 0.05)]
    [InlineData(9, 0.00)]
    [InlineData(0, 0.00)]
    public void QuantityDiscount_CalculatesTieredDiscountsCorrectly(int quantity, decimal expectedRate)
    {
        var result = _calculator.QuantityDiscount(quantity);
        Assert.Equal(expectedRate, result);
    }

    [Theory]
    [InlineData(0, 0.00)]
    [InlineData(5, 0.05)]
    [InlineData(10, 0.10)]
    [InlineData(15, 0.10)] // Capped at 10%
    public void LoyaltyDiscount_CalculatesAndCapsAtTenPercent(int years, decimal expectedRate)
    {
        var result = _calculator.LoyaltyDiscount(years);
        Assert.Equal(expectedRate, result);
    }

    [Fact]
    public void CombinedDiscount_StandardCustomer_SumsQuantityAndLoyalty()
    {
        // 50 qty -> 0.10, 5 years -> 0.05 => 0.15
        var result = _calculator.CombinedDiscount(50, 5, "Standard");
        Assert.Equal(0.15m, result);
    }

    [Fact]
    public void CombinedDiscount_NonprofitCustomer_AddsFivePercentBonus()
    {
        // 50 qty -> 0.10, 5 years -> 0.05 + 0.05 nonprofit bonus => 0.20
        var result = _calculator.CombinedDiscount(50, 5, "Nonprofit");
        Assert.Equal(0.20m, result);
    }

    [Fact]
    public void ApplyDiscount_AppliesDiscountRateAndRoundsToTwoDecimals()
    {
        // 100 * (1 - 0.15) = 85.00
        var result = _calculator.ApplyDiscount(100m, 0.15m);
        Assert.Equal(85.00m, result);

        // 99.99 * (1 - 0.3333) = 66.663333 -> 66.66
        var fractionalResult = _calculator.ApplyDiscount(99.99m, 0.3333m);
        Assert.Equal(66.66m, fractionalResult);
    }
}
