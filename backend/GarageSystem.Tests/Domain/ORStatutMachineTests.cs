using GarageSystem.Domain.Enums;
using GarageSystem.Domain.Exceptions;
using GarageSystem.Domain.Services;
using FluentAssertions;

namespace GarageSystem.Tests.Domain;

public class ORStatutMachineTests
{
    [Theory]
    [InlineData(ORStatut.EnAttente, ORStatut.EnCours, true)]
    [InlineData(ORStatut.EnCours, ORStatut.Suspendu, true)]
    [InlineData(ORStatut.EnCours, ORStatut.TerminéTechnicien, true)]
    [InlineData(ORStatut.Suspendu, ORStatut.EnCours, true)]
    [InlineData(ORStatut.TerminéTechnicien, ORStatut.Livré, true)]
    [InlineData(ORStatut.Livré, ORStatut.EnCours, false)]
    [InlineData(ORStatut.EnAttente, ORStatut.Livré, false)]
    public void CanTransition_ReturnsExpected(ORStatut from, ORStatut to, bool expected)
    {
        ORStatutMachine.CanTransition(from, to).Should().Be(expected);
    }

    [Fact]
    public void ValidateTransition_ThrowsOnInvalid()
    {
        var act = () => ORStatutMachine.ValidateTransition(ORStatut.Livré, ORStatut.EnCours);
        act.Should().Throw<BusinessRuleException>();
    }
}
